import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Collection,
  createAttributeDefinition,
  createItemType,
  createLocation,
  createTag,
  deleteAttributeDefinition,
  deleteCollection,
  deleteItemType,
  deleteLocation,
  deleteTag,
  downloadCollectionExport,
  listAttributeDefinitions,
  listItems,
  listItemTypes,
  listLocations,
  listTags
} from "../../api";
import { AttributeDefinitionsSection } from "../components/AttributeDefinitionsSection";
import { CollectionActionsSection } from "../components/CollectionActionsSection";
import { ItemTypesSection } from "../components/ItemTypesSection";
import { OrganizationSettingsSection } from "../components/OrganizationSettingsSection";
import { useNavigate } from "react-router-dom";

export function SettingsPage({
  selectedCollection
}: Readonly<{
  selectedCollection: Collection;
}>) {
  const collectionId = selectedCollection.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Queries
  const attributeDefinitionsQuery = useQuery({
    queryKey: ["attribute-definitions", collectionId],
    queryFn: () => listAttributeDefinitions(collectionId)
  });

  const itemTypesQuery = useQuery({
    queryKey: ["item-types", collectionId],
    queryFn: () => listItemTypes(collectionId)
  });

  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: listTags
  });

  const locationsQuery = useQuery({
    queryKey: ["locations"],
    queryFn: listLocations
  });

  const itemsQuery = useQuery({
    queryKey: ["items", collectionId],
    queryFn: () => listItems(collectionId)
  });

  const attributeDefinitions = attributeDefinitionsQuery.data ?? [];
  const itemTypes = itemTypesQuery.data ?? [];
  const tags = tagsQuery.data ?? [];
  const locations = locationsQuery.data ?? [];
  const items = itemsQuery.data?.items ?? [];

  // Mutations
  const createAttributeDefinitionMutation = useMutation({
    mutationFn: async (input: {
      name: string;
      dataType: Parameters<typeof createAttributeDefinition>[0]["dataType"];
      isRequired: boolean;
      isFilterable: boolean;
      itemTypeId: string | null;
      onSuccess: () => void;
    }) => {
      await createAttributeDefinition({
        collectionId,
        name: input.name,
        dataType: input.dataType,
        isRequired: input.isRequired,
        isFilterable: input.isFilterable,
        itemTypeId: input.itemTypeId
      });
    },
    onSuccess: async (_, variables) => {
      variables.onSuccess();
      await queryClient.invalidateQueries({ queryKey: ["attribute-definitions", collectionId] });
    }
  });

  const deleteAttributeDefinitionMutation = useMutation({
    mutationFn: deleteAttributeDefinition,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["attribute-definitions", collectionId] }),
        queryClient.invalidateQueries({ queryKey: ["items", collectionId] }),
        queryClient.invalidateQueries({ queryKey: ["item-detail", collectionId] }),
      ]);
    }
  });

  const createItemTypeMutation = useMutation({
    mutationFn: async (input: { name: string; onSuccess: () => void }) => {
      await createItemType({ collectionId, name: input.name });
    },
    onSuccess: async (_, variables) => {
      variables.onSuccess();
      await queryClient.invalidateQueries({ queryKey: ["item-types", collectionId] });
    }
  });

  const deleteItemTypeMutation = useMutation({
    mutationFn: deleteItemType,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["item-types", collectionId] }),
        queryClient.invalidateQueries({ queryKey: ["attribute-definitions", collectionId] }),
        queryClient.invalidateQueries({ queryKey: ["items", collectionId] }),
        queryClient.invalidateQueries({ queryKey: ["item-detail", collectionId] }),
      ]);
    }
  });

  const createTagMutation = useMutation({
    mutationFn: async (input: { name: string; onSuccess: () => void }) => {
      await createTag(input.name);
    },
    onSuccess: async (_, variables) => {
      variables.onSuccess();
      await queryClient.invalidateQueries({ queryKey: ["tags"] });
    }
  });

  const deleteTagMutation = useMutation({
    mutationFn: deleteTag,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tags"] }),
        queryClient.invalidateQueries({ queryKey: ["items", collectionId] }),
        queryClient.invalidateQueries({ queryKey: ["item-detail", collectionId] }),
      ]);
    }
  });

  const createLocationMutation = useMutation({
    mutationFn: async (input: { name: string; description: string; onSuccess: () => void }) => {
      await createLocation({ name: input.name, description: input.description });
    },
    onSuccess: async (_, variables) => {
      variables.onSuccess();
      await queryClient.invalidateQueries({ queryKey: ["locations"] });
    }
  });

  const deleteLocationMutation = useMutation({
    mutationFn: deleteLocation,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["locations"] }),
        queryClient.invalidateQueries({ queryKey: ["items", collectionId] }),
        queryClient.invalidateQueries({ queryKey: ["item-detail", collectionId] }),
      ]);
    }
  });

  const deleteCollectionMutation = useMutation({
    mutationFn: deleteCollection,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["collections"] });
      navigate("/");
    }
  });

  return (
    <section className="content-grid">
      <AttributeDefinitionsSection
        attributeDefinitions={attributeDefinitions}
        collectionName={selectedCollection.name}
        createError={createAttributeDefinitionMutation.error}
        isCreatePending={createAttributeDefinitionMutation.isPending}
        isDeletePending={deleteAttributeDefinitionMutation.isPending}
        itemTypes={itemTypes}
        onCreate={(input) =>
          createAttributeDefinitionMutation.mutate({
            name: input.name,
            dataType: input.dataType,
            isRequired: input.isRequired,
            isFilterable: input.isFilterable,
            itemTypeId: input.itemTypeId,
            onSuccess: input.onSuccess
          })
        }
        onDelete={(attributeDefinitionId) =>
          deleteAttributeDefinitionMutation.mutate({ collectionId, attributeDefinitionId })
        }
      />

      <ItemTypesSection
        collectionName={selectedCollection.name}
        createError={createItemTypeMutation.error}
        isCreatePending={createItemTypeMutation.isPending}
        isDeletePending={deleteItemTypeMutation.isPending}
        itemTypes={itemTypes}
        onCreate={(input) =>
          createItemTypeMutation.mutate({
            name: input.name,
            onSuccess: input.onSuccess
          })
        }
        onDelete={(itemTypeId) => deleteItemTypeMutation.mutate({ collectionId, itemTypeId })}
      />

      <OrganizationSettingsSection
        createLocationError={createLocationMutation.error}
        createTagError={createTagMutation.error}
        isCreateLocationPending={createLocationMutation.isPending}
        isCreateTagPending={createTagMutation.isPending}
        isDeleteLocationPending={deleteLocationMutation.isPending}
        isDeleteTagPending={deleteTagMutation.isPending}
        items={items}
        locations={locations}
        tags={tags}
        onCreateLocation={(input) =>
          createLocationMutation.mutate({
            name: input.name,
            description: input.description,
            onSuccess: input.onSuccess
          })
        }
        onCreateTag={(input) =>
          createTagMutation.mutate({
            name: input.name,
            onSuccess: input.onSuccess
          })
        }
        onDeleteLocation={(locationId) => deleteLocationMutation.mutate(locationId)}
        onDeleteTag={(tagId) => deleteTagMutation.mutate(tagId)}
      />

      <CollectionActionsSection
        collectionId={selectedCollection.id}
        collectionName={selectedCollection.name}
        isDeletePending={deleteCollectionMutation.isPending}
        onDeleteCollection={(id) => deleteCollectionMutation.mutate(id)}
        onExportCollection={(id, exportFileName) => {
          void downloadCollectionExport(id, exportFileName);
        }}
      />
    </section>
  );
}
