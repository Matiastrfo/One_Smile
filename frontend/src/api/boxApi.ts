import api from './axios';
import type { Box } from '../types';

export const getBoxes = async (): Promise<Box[]> => {
  const response = await api.get('/api/admin/boxes');
  return response.data;
};

export const getBox = async (id: number): Promise<Box> => {
  const response = await api.get(`/api/admin/boxes/${id}`);
  return response.data;
};

export const createBox = async (box: Box): Promise<Box> => {
  const response = await api.post('/api/admin/boxes', box);
  return response.data;
};

export const updateBox = async (id: number, box: Box): Promise<Box> => {
  const response = await api.put(`/api/admin/boxes/${id}`, box);
  return response.data;
};

export const deleteBox = async (id: number): Promise<void> => {
  await api.delete(`/api/admin/boxes/${id}`);
};
