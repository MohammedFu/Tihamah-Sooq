import { useCreate, useDelete, useList, useUpdate } from "@refinedev/core";
import { useAdminAction } from "../../../providers/useAdminAction";
import type { BannerInput } from "../../../services/admin/contracts";
import type { ApiError } from "../../../services/http";
import type { Banner } from "../../../types/domain";

export function useBanners() {
  const runAction = useAdminAction();

  const bannersList = useList<Banner, ApiError>({
    resource: "banners",
    pagination: { mode: "off" },
    queryOptions: { retry: false },
  });

  const createMutation = useCreate<Banner, ApiError, BannerInput>({
    successNotification: false,
    errorNotification: false,
  });

  const updateMutation = useUpdate<Banner, ApiError, BannerInput>({
    mutationMode: "pessimistic",
    successNotification: false,
    errorNotification: false,
  });

  const deleteMutation = useDelete<Banner, ApiError>();

  const isPending =
    createMutation.mutation.isPending ||
    updateMutation.mutation.isPending ||
    deleteMutation.mutation.isPending;

  return {
    bannersList,
    isPending,
    async createBanner(values: BannerInput) {
      return runAction("banner", async () => {
        const response = await createMutation.mutateAsync({
          resource: "banners",
          values,
          successNotification: false,
          errorNotification: false,
        });
        return response.data;
      });
    },
    async updateBanner(id: number, values: BannerInput) {
      return runAction("banner", async () => {
        const response = await updateMutation.mutateAsync({
          resource: "banners",
          id,
          values,
          mutationMode: "pessimistic",
          successNotification: false,
          errorNotification: false,
        });
        return response.data;
      });
    },
    async deleteBanner(id: number) {
      return runAction("banner", async () => {
        const response = await deleteMutation.mutateAsync({
          resource: "banners",
          id,
          mutationMode: "pessimistic",
          successNotification: false,
          errorNotification: false,
        });
        return response.data;
      });
    },
    async toggleBannerActive(banner: Banner) {
      return runAction("banner", async () => {
        const response = await updateMutation.mutateAsync({
          resource: "banners",
          id: banner.id,
          values: {
            imageUrl: banner.imageUrl,
            sortOrder: banner.sortOrder,
            isActive: !banner.isActive,
          },
          mutationMode: "pessimistic",
          successNotification: false,
          errorNotification: false,
        });
        return response.data;
      });
    },
    async reorderBanners(
      bannerA: Banner,
      newOrderA: number,
      bannerB: Banner,
      newOrderB: number,
    ) {
      return runAction("banner", async () => {
        await updateMutation.mutateAsync({
          resource: "banners",
          id: bannerA.id,
          values: {
            imageUrl: bannerA.imageUrl,
            sortOrder: newOrderA,
            isActive: bannerA.isActive,
          },
          mutationMode: "pessimistic",
          successNotification: false,
          errorNotification: false,
        });
        const response = await updateMutation.mutateAsync({
          resource: "banners",
          id: bannerB.id,
          values: {
            imageUrl: bannerB.imageUrl,
            sortOrder: newOrderB,
            isActive: bannerB.isActive,
          },
          mutationMode: "pessimistic",
          successNotification: false,
          errorNotification: false,
        });
        return response.data;
      });
    },
  };
}
