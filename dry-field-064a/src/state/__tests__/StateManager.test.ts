import { StateManager } from '../StateManager';
import { StateCategory, StateChange, ValidationRule } from '../../types/state';
import '@types/jest';

describe('StateManager', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    stateManager = new StateManager();
  });

  describe('Transaction Management', () => {
    test('should handle basic state updates', () => {
      const newBubbles = [{ id: '1', position: { x: 0, y: 0 } }];
      
      stateManager.beginTransaction();
      stateManager.queueUpdate('physics', ['bubbles'], newBubbles);
      stateManager.commitTransaction();

      const bubbles = stateManager.getState('physics', ['bubbles']);
      expect(bubbles).toEqual(newBubbles);
    });

    test('should rollback transaction on validation failure', () => {
      const invalidRule: ValidationRule = {
        category: 'physics',
        validate: () => [{
          severity: 'error',
          message: 'Test error',
          path: ['physics']
        }]
      };

      stateManager.addValidationRule(invalidRule);
      
      const originalBubbles = stateManager.getState('physics', ['bubbles']);
      const newBubbles = [{ id: '1', position: { x: 0, y: 0 } }];

      expect(() => {
        stateManager.beginTransaction();
        stateManager.queueUpdate('physics', ['bubbles'], newBubbles);
        stateManager.commitTransaction();
      }).toThrow();

      const bubbles = stateManager.getState('physics', ['bubbles']);
      expect(bubbles).toEqual(originalBubbles);
    });

    test('should maintain transaction history', () => {
      const update1 = { id: '1', position: { x: 0, y: 0 } };
      const update2 = { id: '2', position: { x: 1, y: 1 } };

      stateManager.beginTransaction();
      stateManager.queueUpdate('physics', ['bubbles'], [update1]);
      stateManager.commitTransaction();

      stateManager.beginTransaction();
      stateManager.queueUpdate('physics', ['bubbles'], [update1, update2]);
      stateManager.commitTransaction();

      const history = stateManager.getTransactionHistory();
      expect(history).toHaveLength(2);
      expect(history[1].changes[0].newValue).toEqual([update1, update2]);
    });
  });

  describe('Subscription Management', () => {
    test('should notify subscribers of state changes', () => {
      const mockSubscriber = jest.fn();
      const unsubscribe = stateManager.subscribe('physics', mockSubscriber);

      const newBubbles = [{ id: '1', position: { x: 0, y: 0 } }];
      
      stateManager.beginTransaction();
      stateManager.queueUpdate('physics', ['bubbles'], newBubbles);
      stateManager.commitTransaction();

      expect(mockSubscriber).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({
          category: 'physics',
          path: ['bubbles'],
          newValue: newBubbles
        })
      ]));

      unsubscribe();

      stateManager.beginTransaction();
      stateManager.queueUpdate('physics', ['bubbles'], []);
      stateManager.commitTransaction();

      expect(mockSubscriber).toHaveBeenCalledTimes(1);
    });

    test('should handle multiple subscribers for different categories', () => {
      const physicsSubscriber = jest.fn();
      const visualSubscriber = jest.fn();

      stateManager.subscribe('physics', physicsSubscriber);
      stateManager.subscribe('visual', visualSubscriber);

      stateManager.beginTransaction();
      stateManager.queueUpdate('physics', ['bubbles'], []);
      stateManager.commitTransaction();

      expect(physicsSubscriber).toHaveBeenCalled();
      expect(visualSubscriber).not.toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    test('should validate state changes before applying', () => {
      const validationRule: ValidationRule = {
        category: 'physics',
        validate: (state) => {
          const bubbles = state.physics.bubbles;
          if (bubbles.length > 2) {
            return [{
              severity: 'error',
              message: 'Too many bubbles',
              path: ['physics', 'bubbles']
            }];
          }
          return [];
        }
      };

      stateManager.addValidationRule(validationRule);

      // Valid update
      stateManager.beginTransaction();
      stateManager.queueUpdate('physics', ['bubbles'], [{ id: '1' }, { id: '2' }]);
      stateManager.commitTransaction();

      // Invalid update
      expect(() => {
        stateManager.beginTransaction();
        stateManager.queueUpdate('physics', ['bubbles'], [{ id: '1' }, { id: '2' }, { id: '3' }]);
        stateManager.commitTransaction();
      }).toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should throw error when accessing invalid state path', () => {
      expect(stateManager.getState('physics', ['invalid', 'path'])).toBeUndefined();
    });

    test('should throw error when updating state outside transaction', () => {
      expect(() => {
        stateManager.queueUpdate('physics', ['bubbles'], []);
      }).toThrow('Must begin transaction before updating state');
    });

    test('should throw error when committing without active transaction', () => {
      expect(() => {
        stateManager.commitTransaction();
      }).toThrow('No transaction in progress');
    });
  });
}); 