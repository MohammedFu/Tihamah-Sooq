import { useCreate, useDelete, useList, useUpdate } from "@refinedev/core";
import { useAdminAction } from "../../../providers/useAdminAction";
import type { CategoryInput } from "../../../services/admin/contracts";
import type { ApiError } from "../../../services/http";
import type { Category } from "../../../types/domain";

export function useCategories() {
  const runAction = useAdminAction();

  const categoriesList = useList<Category, ApiError>({
    resource: "categories",
    pagination: { mode: "off" },
    queryOptions: { retry: false },
  });

  const createMutation = useCreate<Category, ApiError, CategoryInput>({
    successNotification: false,
    errorNotification: false,
  });

  const updateMutation = useUpdate<Category, ApiError, CategoryInput>({
    mutationMode: "pessimistic",
    successNotification: false,
    errorNotification: false,
  });

  const deleteMutation = useDelete<Category, ApiError>();

  const isPending =
    createMutation.mutation.isPending ||
    updateMutation.mutation.isPending ||
    deleteMutation.mutation.isPending;

  return {
    categoriesList,
    isPending,
    async createCategory(values: CategoryInput) {
      return runAction("category", async () => {
        const response = await createMutation.mutateAsync({
          resource: "categories",
          values,
          successNotification: false,
          errorNotification: false,
        });
        return response.data;
      });
    },
    async updateCategory(id: number, values: CategoryInput) {
      return runAction("category", async () => {
        const response = await updateMutation.mutateAsync({
          resource: "categories",
          id,
          values,
          mutationMode: "pessimistic",
          successNotification: false,
          errorNotification: false,
        });
        return response.data;
      });
    },
    async deleteCategory(id: number) {
      return runAction("category", async () => {
        const response = await deleteMutation.mutateAsync({
          resource: "categories",
          id,
          mutationMode: "pessimistic",
          successNotification: false,
          errorNotification: false,
        });
        return response.data;
      });
    },
    async toggleCategoryActive(category: Category) {
      return runAction("category", async () => {
        const response = await updateMutation.mutateAsync({
          resource: "categories",
          id: category.id,
          values: {
            name: category.name,
            iconUrl: category.iconUrl,
            sortOrder: category.sortOrder,
            isActive: !category.isActive,
          },
          mutationMode: "pessimistic",
          successNotification: false,
          errorNotification: false,
        });
        return response.data;
      });
    },
    async reorderCategories(catA: Category, newOrderA: number, catB: Category, newOrderB: number) {
      return runAction("category", async () => {
        await updateMutation.mutateAsync({
          resource: "categories",
          id: catA.id,
          values: {
            name: catA.name,
            iconUrl: catA.iconUrl,
            sortOrder: newOrderA,
            isActive: catA.isActive,
          },
          mutationMode: "pessimistic",
          successNotification: false,
          errorNotification: false,
        });
        const response = await updateMutation.mutateAsync({
          resource: "categories",
          id: catB.id,
          values: {
            name: catB.name,
            iconUrl: catB.iconUrl,
            sortOrder: newOrderB,
            isActive: catB.isActive,
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
