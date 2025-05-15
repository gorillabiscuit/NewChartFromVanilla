import { PhysicsStateManager } from '../PhysicsStateManager';
import { StateManager } from '../StateManager';
import { BubbleState, ClusterState } from '../../types/state';
import '@types/jest';

describe('PhysicsStateManager', () => {
  let stateManager: StateManager;
  let physicsManager: PhysicsStateManager;

  beforeEach(() => {
    stateManager = new StateManager();
    physicsManager = new PhysicsStateManager(stateManager);
  });

  describe('Physics Updates', () => {
    test('should update bubble positions based on velocity', () => {
      const bubble: BubbleState = {
        id: '1',
        position: { x: 0, y: 0 },
        velocity: { x: 1, y: 2 },
        acceleration: { x: 0, y: 0 },
        mass: 1,
        radius: 10,
        protocol: 'test',
        loan: {
          amount: 100,
          startDate: new Date(),
          endDate: new Date()
        }
      };

      stateManager.beginTransaction();
      stateManager.queueUpdate('physics', ['bubbles'], [bubble]);
      stateManager.commitTransaction();

      physicsManager.beginPhysicsUpdate();
      physicsManager.updatePhysics(1); // deltaTime = 1
      physicsManager.commitPhysicsUpdate();

      const updatedBubbles = stateManager.getState<BubbleState[]>('physics', ['bubbles']);
      expect(updatedBubbles).toBeDefined();
      expect(updatedBubbles![0].position.x).toBeCloseTo(1);
      expect(updatedBubbles![0].position.y).toBeCloseTo(2);
    });

    test('should handle collisions between bubbles', () => {
      const bubble1: BubbleState = {
        id: '1',
        position: { x: 0, y: 0 },
        velocity: { x: 1, y: 0 },
        acceleration: { x: 0, y: 0 },
        mass: 1,
        radius: 5,
        protocol: 'test',
        loan: {
          amount: 100,
          startDate: new Date(),
          endDate: new Date()
        }
      };

      const bubble2: BubbleState = {
        id: '2',
        position: { x: 8, y: 0 },
        velocity: { x: -1, y: 0 },
        acceleration: { x: 0, y: 0 },
        mass: 1,
        radius: 5,
        protocol: 'test',
        loan: {
          amount: 100,
          startDate: new Date(),
          endDate: new Date()
        }
      };

      stateManager.beginTransaction();
      stateManager.queueUpdate('physics', ['bubbles'], [bubble1, bubble2]);
      stateManager.commitTransaction();

      physicsManager.beginPhysicsUpdate();
      physicsManager.updatePhysics(1);
      physicsManager.commitPhysicsUpdate();

      const updatedBubbles = stateManager.getState<BubbleState[]>('physics', ['bubbles']);
      expect(updatedBubbles).toBeDefined();
      
      // Bubbles should have collided and velocities should have changed
      expect(updatedBubbles![0].velocity.x).toBeLessThan(bubble1.velocity.x);
      expect(updatedBubbles![1].velocity.x).toBeGreaterThan(bubble2.velocity.x);
    });

    test('should maintain frame history', () => {
      const bubble: BubbleState = {
        id: '1',
        position: { x: 0, y: 0 },
        velocity: { x: 1, y: 0 },
        acceleration: { x: 0, y: 0 },
        mass: 1,
        radius: 5,
        protocol: 'test',
        loan: {
          amount: 100,
          startDate: new Date(),
          endDate: new Date()
        }
      };

      stateManager.beginTransaction();
      stateManager.queueUpdate('physics', ['bubbles'], [bubble]);
      stateManager.commitTransaction();

      // Create multiple frames
      for (let i = 0; i < 3; i++) {
        physicsManager.beginPhysicsUpdate();
        physicsManager.updatePhysics(1);
        physicsManager.commitPhysicsUpdate();
      }

      const history = physicsManager.getFrameHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].bubbles.get('1')).toBeDefined();
    });

    test('should interpolate between frames', () => {
      const bubble: BubbleState = {
        id: '1',
        position: { x: 0, y: 0 },
        velocity: { x: 10, y: 0 },
        acceleration: { x: 0, y: 0 },
        mass: 1,
        radius: 5,
        protocol: 'test',
        loan: {
          amount: 100,
          startDate: new Date(),
          endDate: new Date()
        }
      };

      stateManager.beginTransaction();
      stateManager.queueUpdate('physics', ['bubbles'], [bubble]);
      stateManager.commitTransaction();

      // Create two frames
      physicsManager.beginPhysicsUpdate();
      physicsManager.updatePhysics(1);
      const timestamp1 = Date.now();
      physicsManager.commitPhysicsUpdate();

      physicsManager.beginPhysicsUpdate();
      physicsManager.updatePhysics(1);
      const timestamp2 = Date.now() + 1000;
      physicsManager.commitPhysicsUpdate();

      // Interpolate halfway between frames
      const interpolatedState = physicsManager.interpolateFrame(timestamp1 + 500);
      expect(interpolatedState.bubbles[0].position.x).toBeCloseTo(15, 1);
    });
  });

  describe('Cluster Management', () => {
    test('should update expanding clusters', () => {
      const bubble1: BubbleState = {
        id: '1',
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        mass: 1,
        radius: 5,
        protocol: 'test',
        loan: {
          amount: 100,
          startDate: new Date(),
          endDate: new Date()
        }
      };

      const bubble2: BubbleState = {
        id: '2',
        position: { x: 8, y: 0 },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        mass: 1,
        radius: 5,
        protocol: 'test',
        loan: {
          amount: 100,
          startDate: new Date(),
          endDate: new Date()
        }
      };

      const cluster: ClusterState = {
        id: '1',
        bubbles: [bubble1, bubble2],
        state: 'expanding',
        hovering: false,
        frameCount: 0,
        packedInitialized: false
      };

      stateManager.beginTransaction();
      stateManager.queueUpdate('physics', ['clusters'], [cluster]);
      stateManager.commitTransaction();

      physicsManager.beginPhysicsUpdate();
      physicsManager.updatePhysics(1);
      physicsManager.commitPhysicsUpdate();

      const updatedClusters = stateManager.getState<ClusterState[]>('physics', ['clusters']);
      expect(updatedClusters).toBeDefined();
      expect(updatedClusters![0].bubbles[0].position).not.toEqual(bubble1.position);
      expect(updatedClusters![0].bubbles[1].position).not.toEqual(bubble2.position);
    });
  });

  describe('Error Handling', () => {
    test('should handle transaction rollback', () => {
      const bubble: BubbleState = {
        id: '1',
        position: { x: 0, y: 0 },
        velocity: { x: 1, y: 0 },
        acceleration: { x: 0, y: 0 },
        mass: 1,
        radius: 5,
        protocol: 'test',
        loan: {
          amount: 100,
          startDate: new Date(),
          endDate: new Date()
        }
      };

      stateManager.beginTransaction();
      stateManager.queueUpdate('physics', ['bubbles'], [bubble]);
      stateManager.commitTransaction();

      const originalState = stateManager.getState<BubbleState[]>('physics', ['bubbles']);
      expect(originalState).toBeDefined();

      physicsManager.beginPhysicsUpdate();
      physicsManager.updatePhysics(1);
      physicsManager.rollbackPhysicsUpdate();

      const currentState = stateManager.getState<BubbleState[]>('physics', ['bubbles']);
      expect(currentState).toBeDefined();
      expect(currentState).toEqual(originalState);
    });
  });
}); 