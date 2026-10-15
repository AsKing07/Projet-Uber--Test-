import { DistanceGateway } from "../ports/distance.gateway";

export class CalculateDistanceUsecase {
    constructor(
        private readonly distanceScanner: DistanceGateway,
    ) {}

    async execute(origin: string, destination: string,): Promise<number> {
        return this.distanceScanner.getDistance(
            origin,
            destination,
        );
    }
}
