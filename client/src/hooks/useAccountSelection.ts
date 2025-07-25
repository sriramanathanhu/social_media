import { useState, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

export interface AccountGroup {
  id: string;
  name: string;
  description?: string;
  accountIds: string[];
  createdAt: string;
}

export const useAccountSelection = () => {
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [groupAccounts, setGroupAccounts] = useState<any[]>([]);
  
  const { accounts } = useSelector((state: RootState) => state.accounts);

  // Memoized selected accounts data
  const selectedAccountsData = useMemo(() => {
    return accounts.filter(account => selectedAccounts.includes(account.id));
  }, [accounts, selectedAccounts]);

  // Memoized platform-specific accounts
  const accountsByPlatform = useMemo(() => {
    return accounts.reduce((acc, account) => {
      if (!acc[account.platform]) {
        acc[account.platform] = [];
      }
      acc[account.platform].push(account);
      return acc;
    }, {} as Record<string, typeof accounts>);
  }, [accounts]);

  // Check if specific platforms are selected
  const hasSelectedPlatforms = useMemo(() => {
    const platforms = selectedAccountsData.map(acc => acc.platform);
    return {
      pinterest: platforms.includes('pinterest'),
      facebook: platforms.includes('facebook'),
      instagram: platforms.includes('instagram'),
      x: platforms.includes('x') || platforms.includes('twitter'),
      mastodon: platforms.includes('mastodon'),
      bluesky: platforms.includes('bluesky')
    };
  }, [selectedAccountsData]);

  const toggleAccount = useCallback((accountId: string) => {
    setSelectedAccounts(prev => {
      if (prev.includes(accountId)) {
        return prev.filter(id => id !== accountId);
      } else {
        return [...prev, accountId];
      }
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedAccounts(accounts.map(account => account.id));
  }, [accounts]);

  const deselectAll = useCallback(() => {
    setSelectedAccounts([]);
  }, []);

  const selectGroup = useCallback((group: AccountGroup) => {
    setSelectedGroupId(group.id);
    setSelectedAccounts(group.accountIds);
    setGroupAccounts(accounts.filter(account => group.accountIds.includes(account.id)));
  }, [accounts]);

  const clearGroupSelection = useCallback(() => {
    setSelectedGroupId('');
    setGroupAccounts([]);
  }, []);

  return {
    selectedAccounts,
    selectedAccountsData,
    accountsByPlatform,
    hasSelectedPlatforms,
    selectedGroupId,
    groupAccounts,
    toggleAccount,
    selectAll,
    deselectAll,
    selectGroup,
    clearGroupSelection,
    setSelectedAccounts
  };
};

export default useAccountSelection;