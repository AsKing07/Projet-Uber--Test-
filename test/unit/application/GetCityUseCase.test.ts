import { beforeEach, describe, expect, it, vi, type Mocked } from "vitest";

import { DistanceGateway } from "../../../src/application/ports/distance.gateway";
import { GetCityUsecase } from "../../../src/application/use-cases/GetCityUsecase";

describe("GetCityUsecase", () => {
    let getCityUsecase: GetCityUsecase;
    let distanceScanner: Mocked<DistanceGateway>;

    beforeEach(() => {
        distanceScanner = {
            getRoute: vi.fn(),
            getDistance: vi.fn(),
            getCity: vi.fn(),
        };

        getCityUsecase = new GetCityUsecase(distanceScanner);
    });

    it("should return the city for a given address", async () => {
        const address = "10 rue de Rivoli, Paris, France";
        const expectedCity = "Paris";

        distanceScanner.getCity.mockResolvedValue(expectedCity);

        const result = await getCityUsecase.execute(address);

        expect(result).toBe(expectedCity);
        expect(distanceScanner.getCity).toHaveBeenCalledWith(address);
        expect(distanceScanner.getCity).toHaveBeenCalledTimes(1);
    });

    it("should propagate an error if the city cannot be found", async () => {
        const address = "Adresse inconnue";
        const error = new Error("Ville introuvable pour cette adresse");

        distanceScanner.getCity.mockRejectedValue(error);

        await expect(getCityUsecase.execute(address)).rejects.toThrow(
            "Ville introuvable pour cette adresse",
        );
    });
});
