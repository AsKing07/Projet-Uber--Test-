import { DistanceGateway } from "../ports/distance.gateway";

export class GetCityUsecase {
    constructor(
        private readonly distanceScanner: DistanceGateway,
    ) {}

    async execute(address: string): Promise<string> {
        return this.distanceScanner.getCity(address);
    }
}
