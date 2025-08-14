import { MemoryEventBus } from '../router/ee';
import { RoomManager } from './room-manager';

// a simple class to hold all the dependencies of the application
export class AppDependencies {
  private static instance: AppDependencies;
  public readonly eventBus: MemoryEventBus;
  public readonly roomManager: RoomManager;

  private constructor() {
    this.eventBus = new MemoryEventBus();
    this.roomManager = new RoomManager();
  }

  public static getInstance(): AppDependencies {
    if (!AppDependencies.instance) {
      AppDependencies.instance = new AppDependencies();
    }
    return AppDependencies.instance;
  }
}
