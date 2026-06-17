import api from './axios';
import type { Contract } from '../types';

export const getActiveContracts = async (): Promise<Contract[]> => {
  const { data } = await api.get('/api/admin/contracts');
  return data;
};

export const assignProfessional = async (body: {
  professional_id: number;
  box_id: number;
  shift: string;
  day_of_week: string;
  duration_months: number;
}): Promise<Contract> => {
  const { data } = await api.post('/api/admin/contracts', body);
  return data;
};

export const removeContract = async (contractId: number): Promise<void> => {
  await api.delete('/api/admin/contracts/' + contractId);
};

export const transferContract = async (
  contractId: number,
  newBoxId: number,
  newShift: string,
  newDayOfWeek: string,
  swap: boolean = false
): Promise<Contract> => {
  const { data } = await api.post('/api/admin/contracts/' + contractId + '/transfer', {
    new_box_id: newBoxId,
    new_shift: newShift,
    new_day_of_week: newDayOfWeek,
    swap,
  });
  return data;
};
