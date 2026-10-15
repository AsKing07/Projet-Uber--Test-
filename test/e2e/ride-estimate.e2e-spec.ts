import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { BookRideUseCase } from "@/application/book-ride.usecase";
import { EstimateRidePriceUseCase } from "@/application/estimate-ride-price.usecase";
import type { RideEstimate, RideEstimateRepository } from "@/application/ports/ride-estimate.repository";
import { Money } from "@/domain/money";
import { InMemoryRideRepository } from "@test/doubles/in-memory-ride.repository";
import { InMemoryRiderRepository } from "@test/doubles/in-memory-rider.repository";
import { InMemoryUnitOfWork } from "@test/doubles/in-memory-unit-of-work";
import { StubClock } from "@test/doubles/stub-clock";
import { StubDistanceGateway } from "@test/doubles/stub-distance.gateway";
import { StubIdGenerator } from "@test/doubles/stub-id-generator";
import { aRider } from "@test/builders/rider.builder";

class InMemoryRideEstimateRepository implements RideEstimateRepository {
	private readonly estimates = new Map<string, RideEstimate>();

	async save(estimate: RideEstimate): Promise<void> {
		this.estimates.set(estimate.token, estimate);
	}

	async findByToken(token: string): Promise<RideEstimate | undefined> {
		return this.estimates.get(token);
	}

	async markUsed(token: string, usedAt: Date): Promise<void> {
		const estimate = this.estimates.get(token);
		if (estimate) {
			this.estimates.set(token, { ...estimate, usedAt });
		}
	}
}

describe("API : estimation du prix avant réservation", () => {
	let riderRepository: InMemoryRiderRepository;
	let rideRepository: InMemoryRideRepository;
	let estimateRepository: InMemoryRideEstimateRepository;
	let clock: StubClock;
	let distanceGateway: StubDistanceGateway;
	let app: express.Express;

	beforeEach(() => {
		riderRepository = new InMemoryRiderRepository();
		rideRepository = new InMemoryRideRepository();
		estimateRepository = new InMemoryRideEstimateRepository();
		clock = StubClock.at("2026-03-10T12:00:00+01:00");
		distanceGateway = new StubDistanceGateway({
			from: { address: "10 rue de Rivoli", city: "Paris" },
			to: { address: "Lyon", city: "Lyon" },
			distanceKm: 10,
		});

		const estimateUseCase = new EstimateRidePriceUseCase(
			riderRepository,
			distanceGateway,
			clock,
			new StubIdGenerator("estimate-1"),
			estimateRepository,
		);
		const bookRideUseCase = new BookRideUseCase(
			new InMemoryUnitOfWork({ riders: riderRepository, rides: rideRepository }),
			distanceGateway,
			new StubIdGenerator("ride-1"),
			clock,
			estimateRepository,
		);

		app = express();
		app.use(express.json());
		app.post("/rides/estimate", async (req, res) => {
			try {
				const result = await estimateUseCase.handle(req.body);
				return res.status(200).json(result);
			} catch (error) {
				const message = error instanceof Error ? error.message : "Erreur inconnue";
				return res.status(404).json({ error: message });
			}
		});
		app.post("/rides", async (req, res) => {
			try {
				const ride = await bookRideUseCase.handle(req.body);
				return res.status(201).json(ride);
			} catch (error) {
				if (error instanceof Error && "code" in error) {
					const domainError = error as { code: string; message: string };
					if (domainError.code === "ESTIMATE_EXPIRED") return res.status(409).json({ code: domainError.code, message: domainError.message });
					if (domainError.code === "ESTIMATE_ALREADY_USED") return res.status(409).json({ code: domainError.code, message: domainError.message });
					if (domainError.code === "ESTIMATE_NOT_FOUND") return res.status(400).json({ code: domainError.code, message: domainError.message });
				}
				const message = error instanceof Error ? error.message : "Erreur inconnue";
				return res.status(500).json({ error: message });
			}
		});
	});

	it("renvoie un token puis autorise la réservation avec ce token", async () => {
		await riderRepository.save(aRider().withId("rider-1").withBalance(Money.euros(100)).build());

		const estimateResponse = await request(app)
			.post("/rides/estimate")
			.send({ riderId: "rider-1", fromAddress: "10 rue de Rivoli", toAddress: "Lyon" })
			.expect(200);

		expect(estimateResponse.body).toMatchObject({
			token: "estimate-1",
			riderId: "rider-1",
			distanceKm: 10,
		});
		expect(estimateResponse.body.price).toEqual(Money.euros(15));

		const bookingResponse = await request(app)
			.post("/rides")
			.send({
				riderId: "rider-1",
				fromAddress: "10 rue de Rivoli",
				toAddress: "Lyon",
				estimateToken: estimateResponse.body.token,
			})
			.expect(201);

		expect(bookingResponse.body.price).toEqual(Money.euros(15));
		expect(bookingResponse.body.status).toBe("PENDING");
		expect((await estimateRepository.findByToken(estimateResponse.body.token))?.usedAt).toBeInstanceOf(Date);
	});

	it("refuse la réservation si le token a expiré", async () => {
		await riderRepository.save(aRider().withId("rider-1").withBalance(Money.euros(100)).build());
		await estimateRepository.save({
			token: "expired-token",
			riderId: "rider-1",
			route: {
				from: { address: "10 rue de Rivoli", city: "Paris" },
				to: { address: "Lyon", city: "Lyon" },
				distanceKm: 10,
			},
			options: { uberX: false },
			price: Money.euros(15),
			createdAt: new Date("2026-03-10T11:00:00+01:00"),
			expiresAt: new Date("2026-03-10T11:59:59+01:00"),
			usedAt: null,
		});

		const response = await request(app)
			.post("/rides")
			.send({
				riderId: "rider-1",
				fromAddress: "10 rue de Rivoli",
				toAddress: "Lyon",
				estimateToken: "expired-token",
			})
			.expect(409);

		expect(response.body.code).toBe("ESTIMATE_EXPIRED");
	});
});
