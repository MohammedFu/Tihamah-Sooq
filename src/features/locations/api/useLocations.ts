import { useCreate, useDelete, useList, useUpdate } from "@refinedev/core";
import { useAdminAction } from "../../../providers/useAdminAction";
import type { RegionInput, VillageInput } from "../../../services/admin/contracts";
import type { ApiError } from "../../../services/http";
import type { Region, Village } from "../../../types/domain";

export function useLocations() {
  const runAction = useAdminAction();

  const regionsList = useList<Region, ApiError>({
    resource: "regions",
    pagination: { mode: "off" },
    queryOptions: { retry: false },
  });

  const createMutation = useCreate<Region | Village, ApiError, RegionInput | VillageInput>({
    successNotification: false,
    errorNotification: false,
  });

  const updateMutation = useUpdate<Region | Village, ApiError, RegionInput | VillageInput>({
    mutationMode: "pessimistic",
    successNotification: false,
    errorNotification: false,
  });

  const deleteMutation = useDelete<Region | Village, ApiError>();

  const isPending =
    createMutation.mutation.isPending ||
    updateMutation.mutation.isPending ||
    deleteMutation.mutation.isPending;

  return {
    regionsList,
    isPending,
    async createRegion(values: RegionInput) {
      return runAction("region", async () => {
        const response = await createMutation.mutateAsync({
          resource: "regions",
          values,
          successNotification: false,
          errorNotification: false,
        });
        return response.data;
      });
    },
    async updateRegion(id: number, values: RegionInput) {
      return runAction("region", async () => {
        const response = await updateMutation.mutateAsync({
          resource: "regions",
          id,
          values,
          mutationMode: "pessimistic",
          successNotification: false,
          errorNotification: false,
        });
        return response.data;
      });
    },
    async deleteRegion(id: number) {
      return runAction("region", async () => {
        const response = await deleteMutation.mutateAsync({
          resource: "regions",
          id,
          mutationMode: "pessimistic",
          successNotification: false,
          errorNotification: false,
        });
        return response.data;
      });
    },
    async createVillage(values: VillageInput) {
      return runAction("village", async () => {
        const response = await createMutation.mutateAsync({
          resource: "villages",
          values,
          successNotification: false,
          errorNotification: false,
        });
        return response.data;
      });
    },
    async updateVillage(id: number, values: VillageInput) {
      return runAction("village", async () => {
        const response = await updateMutation.mutateAsync({
          resource: "villages",
          id,
          values,
          mutationMode: "pessimistic",
          successNotification: false,
          errorNotification: false,
        });
        return response.data;
      });
    },
    async deleteVillage(id: number) {
      return runAction("village", async () => {
        const response = await deleteMutation.mutateAsync({
          resource: "villages",
          id,
          mutationMode: "pessimistic",
          successNotification: false,
          errorNotification: false,
        });
        return response.data;
      });
    },
  };
}
