import {it,describe, beforeEach, expect, vi, Mocked} from "vitest";
import "dotenv/config";

import { CalculateDistanceUsecase} from "../../../src/application/use-cases/Calculate-Distance.usecase";
import {DistanceGateway} from "../../../src/application/ports/distance.gateway";


describe("CalculateDistance", () => {
    let calculateDistance: CalculateDistanceUsecase;
    let distanceScanner: Mocked<DistanceGateway>;

    beforeEach(() => {
        distanceScanner = {getDistance: vi.fn(), getCity: vi.fn(),};

        calculateDistance = new CalculateDistanceUsecase(distanceScanner);
    });

    it("should return the distance between two addresses", async () => {
        // Arrange
        const origin = "Paris, France";
        const destination = "Lyon, France";
        const expectedDistance = 4650000000;

        distanceScanner.getDistance.mockResolvedValue(expectedDistance);

        // Act
        const result = await calculateDistance.execute(origin, destination);

        // Assert
        expect(result).toBe(expectedDistance);
        expect(distanceScanner.getDistance).toHaveBeenCalledWith(
            origin,
            destination,
        );
        expect(distanceScanner.getDistance).toHaveBeenCalledTimes(1);
    });

    it("should propagate an error if the distance cannot be calculated", async () => {
        // Arrange
        const origin = "Adresse inconnue";
        const destination = "Lyon, France";
        const error = new Error("Impossible de calculer la distance");

        distanceScanner.getDistance.mockRejectedValue(error);

        // Act & Assert
        await expect(
            calculateDistance.execute(origin, destination),
        ).rejects.toThrow("Impossible de calculer la distance");
    });
});
