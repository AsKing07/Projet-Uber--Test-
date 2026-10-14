import { rideRepositoryContract } from "../../contracts/ride-repository.contract";
import { riderRepositoryContract } from "../../contracts/rider-repository.contract";
import { InMemoryRideRepository } from "../../doubles/in-memory-ride.repository";
import { InMemoryRiderRepository } from "../../doubles/in-memory-rider.repository";

rideRepositoryContract("InMemoryRideRepository", async () => new InMemoryRideRepository());
riderRepositoryContract("InMemoryRiderRepository", async () => new InMemoryRiderRepository());
