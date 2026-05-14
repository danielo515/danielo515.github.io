import { co, type Group, type Loaded, z } from "jazz-tools";

type ShoppingListItem = {
  readonly name: string;
  readonly quantity: number;
  readonly emoji: string | null;
};

const ItemStatus = z.discriminatedUnion("_tag", [
  z.object({ _tag: z.literal("pending") }),
  z.object({ _tag: z.literal("completed"), completedAt: z.date() }),
]);

export const ListItem = co.map({
  name: z.string(),
  quantity: z.number(),
  emoji: z.string(),
  status: ItemStatus,
  addedAt: z.date(),
});
export type LoadedListItem = Loaded<typeof ListItem>;

export const ListItems = co.list(ListItem);
export type LoadedListItems = Loaded<typeof ListItems>;

export const ListEntry = co.map({
  items: ListItems,
  type: z.enum(["todo", "shopping"]),
  createdAt: z.date(),
});
export type LoadedListEntry = Loaded<typeof ListEntry>;

export function completeItem(item: LoadedListItem) {
  item.$jazz.set("status", { _tag: "completed", completedAt: new Date() });
}

export function uncompleteItem(item: LoadedListItem) {
  item.$jazz.set("status", { _tag: "pending" });
}

export function addItem(
  items: LoadedListItems,
  item: ShoppingListItem,
  addedAt: Date
) {
  const owner = items.$jazz.owner as Group;
  items.$jazz.push(
    ListItem.create(
      {
        name: item.name,
        quantity: item.quantity,
        emoji: item.emoji ?? "",
        addedAt,
        status: { _tag: "pending" },
      },
      { owner }
    )
  );
}

export function makeList({
  items,
  owner,
  addedAt,
}: {
  items: Readonly<ShoppingListItem[]>;
  owner: Group;
  addedAt: Date;
}) {
  return ListEntry.create(
    {
      createdAt: addedAt,
      type: "shopping",
      items: ListItems.create(
        items.map((item) =>
          ListItem.create(
            {
              name: item.name,
              quantity: item.quantity,
              emoji: item.emoji ?? "",
              addedAt,
              status: { _tag: "pending" },
            },
            { owner }
          )
        ),
        { owner }
      ),
    },
    { owner }
  );
}
