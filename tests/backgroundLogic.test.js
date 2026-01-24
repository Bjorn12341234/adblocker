import { updateRules } from '../src/lib/backgroundLogic';
import * as storage from '../src/lib/storage';
import * as rules from '../src/lib/rules';

// Mock dependencies
jest.mock('../src/lib/storage');
jest.mock('../src/lib/rules');

describe('Background Logic', () => {
  const originalChrome = global.chrome;
  const mockUpdateDynamicRules = jest.fn();
  const mockGetDynamicRules = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.chrome = {
      declarativeNetRequest: {
        getDynamicRules: mockGetDynamicRules,
        updateDynamicRules: mockUpdateDynamicRules,
      },
    };

    // Default mocks
    storage.getStorage.mockResolvedValue({
      lists: { whitelist: [], userKeywords: [] },
    });
    rules.generateRules.mockReturnValue([]);
    mockGetDynamicRules.mockResolvedValue([]);
    mockUpdateDynamicRules.mockResolvedValue();
  });

  afterEach(() => {
    global.chrome = originalChrome;
  });

  test('updateRules fetches storage, generates rules, and updates DNR', async () => {
    const mockLists = { whitelist: ['test.com'], userKeywords: ['word'] };
    const mockRules = [{ id: 1, action: { type: 'block' } }];
    const existingRules = [{ id: 999 }];

    storage.getStorage.mockResolvedValue({ lists: mockLists });
    rules.generateRules.mockReturnValue(mockRules);
    mockGetDynamicRules.mockResolvedValue(existingRules);

    await updateRules();

    expect(storage.getStorage).toHaveBeenCalled();
    expect(rules.generateRules).toHaveBeenCalledWith(mockLists);
    expect(mockGetDynamicRules).toHaveBeenCalled();
    expect(mockUpdateDynamicRules).toHaveBeenCalledWith({
      removeRuleIds: [999],
      addRules: mockRules,
    });
  });

  test('handles errors gracefully', async () => {
    storage.getStorage.mockRejectedValue(new Error('Storage failure'));
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await expect(updateRules()).rejects.toThrow('Storage failure');
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to update rules:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});
