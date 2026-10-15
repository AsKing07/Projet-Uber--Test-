import { driverRepositoryContract } from "../../contracts/driver-repository.contract";
import { rideEstimateRepositoryContract } from "../../contracts/ride-estimate-repository.contract";
import { rideRepositoryContract } from "../../contracts/ride-repository.contract";
import { riderRepositoryContract } from "../../contracts/rider-repository.contract";
import { InMemoryDriverRepository } from "../../doubles/in-memory-driver.repository";
import { InMemoryRideRepository } from "../../doubles/in-memory-ride.repository";
import { InMemoryRideEstimateRepository } from "../../doubles/in-memory-ride-estimate.repository";
import { InMemoryRiderRepository } from "../../doubles/in-memory-rider.repository";

driverRepositoryContract("InMemoryDriverRepository", async () => new InMemoryDriverRepository());
rideRepositoryContract("InMemoryRideRepository", async () => new InMemoryRideRepository());
riderRepositoryContract("InMemoryRiderRepository", async () => new InMemoryRiderRepository());
rideEstimateRepositoryContract(
	"InMemoryRideEstimateRepository",
	async () => new InMemoryRideEstimateRepository(),
);
