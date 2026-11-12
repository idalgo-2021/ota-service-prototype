import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

const hotelCompare = createSlice({
  name: 'hotelCompare',
  initialState: { ids: [] as string[] },
  reducers: {
    toggleHotelComparison(state, { payload: id }: PayloadAction<string>) {
      const index = state.ids.indexOf(id);
      if (index === -1) {
        state.ids.push(id);
      } else {
        state.ids.splice(index, 1);
      }
    },
    removeHotelComparison(state, { payload: id }: PayloadAction<string>) {
      state.ids = state.ids.filter((value) => value !== id);
    },
    clearHotelComparison(state) {
      state.ids = [];
    },
  },
});

export const { toggleHotelComparison, removeHotelComparison, clearHotelComparison } =
  hotelCompare.actions;
export const hotelCompareReducer = hotelCompare.reducer;
