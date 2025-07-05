import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { accountsAPI, authAPI } from '../../services/api';
import { SocialAccount } from '../../types';

interface AccountsState {
  accounts: SocialAccount[];
  loading: boolean;
  error: string | null;
  connectingMastodon: boolean;
  connectingX: boolean;
}

const initialState: AccountsState = {
  accounts: [],
  loading: false,
  error: null,
  connectingMastodon: false,
  connectingX: false,
};

export const fetchAccounts = createAsyncThunk(
  'accounts/fetchAccounts',
  async () => {
    const response = await accountsAPI.getAccounts();
    return response.data.accounts;
  }
);

export const connectMastodon = createAsyncThunk(
  'accounts/connectMastodon',
  async (instanceUrl: string) => {
    const response = await authAPI.connectMastodon(instanceUrl);
    return response.data;
  }
);

export const connectX = createAsyncThunk(
  'accounts/connectX',
  async () => {
    const response = await authAPI.connectX();
    return response.data;
  }
);

export const deleteAccount = createAsyncThunk(
  'accounts/deleteAccount',
  async (accountId: string) => {
    await accountsAPI.deleteAccount(accountId);
    return accountId;
  }
);

export const verifyAccount = createAsyncThunk(
  'accounts/verifyAccount',
  async (accountId: string) => {
    const response = await accountsAPI.verifyAccount(accountId);
    return { accountId, ...response.data };
  }
);

const accountsSlice = createSlice({
  name: 'accounts',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    addAccount: (state, action) => {
      state.accounts.push(action.payload);
    },
    updateAccountStatus: (state, action) => {
      const { accountId, status } = action.payload;
      const account = state.accounts.find(acc => acc.id === accountId);
      if (account) {
        account.status = status;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAccounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAccounts.fulfilled, (state, action) => {
        state.loading = false;
        state.accounts = action.payload;
      })
      .addCase(fetchAccounts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch accounts';
      })
      .addCase(connectMastodon.pending, (state) => {
        state.connectingMastodon = true;
        state.error = null;
      })
      .addCase(connectMastodon.fulfilled, (state, action) => {
        state.connectingMastodon = false;
      })
      .addCase(connectMastodon.rejected, (state, action) => {
        state.connectingMastodon = false;
        state.error = action.error.message || 'Failed to connect Mastodon account';
      })
      .addCase(connectX.pending, (state) => {
        state.connectingX = true;
        state.error = null;
      })
      .addCase(connectX.fulfilled, (state, action) => {
        state.connectingX = false;
      })
      .addCase(connectX.rejected, (state, action) => {
        state.connectingX = false;
        state.error = action.error.message || 'Failed to connect X account';
      })
      .addCase(deleteAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAccount.fulfilled, (state, action) => {
        state.loading = false;
        state.accounts = state.accounts.filter(acc => acc.id !== action.payload);
      })
      .addCase(deleteAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete account';
      })
      .addCase(verifyAccount.fulfilled, (state, action) => {
        const { accountId, verified } = action.payload;
        const account = state.accounts.find(acc => acc.id === accountId);
        if (account) {
          account.status = verified ? 'active' : 'error';
        }
      });
  },
});

export const { clearError, addAccount, updateAccountStatus } = accountsSlice.actions;
export default accountsSlice.reducer;