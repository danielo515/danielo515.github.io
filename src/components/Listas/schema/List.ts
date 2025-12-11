import { CoList, CoMap, type Group, co } from "jazz-tools";

type ShoppingListItem = {
  readonly name: string;
  readonly quantity: number;
  readonly emoji: string | null;
};

type Completed = {
  _tag: "completed";
  completedAt: Date;
};

type Pending = {
  _tag: "pending";
};

export class ListItem extends CoMap {
  name = co.string;
  quantity = co.number;
  emoji = co.string;
  status = co.json<Pending | Completed>();
  addedAt = co.Date;

  complete = () => {
    this.status = { _tag: "completed", completedAt: new Date() };
  };
  uncomplete = () => {
    this.status = { _tag: "pending" };
  };

  static fromShoppingListItem(
    item: ShoppingListItem,
    addedAt: Date,
    owner: Group
  ) {
    return ListItem.create(
      {
        name: item.name,
        quantity: item.quantity,
        emoji: item.emoji ?? "",
        addedAt,
        status: { _tag: "pending" },
      },
      { owner }
    );
  }
}
export class ListItems extends CoList.Of(co.ref(ListItem)) {
  add(item: ShoppingListItem, addedAt: Date) {
    this.push(
      ListItem.fromShoppingListItem(item, addedAt, this._owner as Group)
    );
    return this;
  }
  addAll = (items: Readonly<ShoppingListItem[]>, addedAt: Date) => {
    items.forEach((item) => this.add(item, addedAt));
    return this;
  };
}

export class ListEntry extends CoMap {
  items = co.ref(ListItems);
  type = co.literal("todo", "shopping");

  createdAt = co.Date;

  static make({
    items,
    owner,
    addedAt,
  }: {
    items: Readonly<ShoppingListItem[]>;
    owner: Group;
    addedAt: Date;
  }) {
    const newList = ListEntry.create(
      {
        createdAt: addedAt,
        type: "shopping",
        items: ListItems.create(
          items.map((item) =>
            ListItem.fromShoppingListItem(item, addedAt, owner)
          ),
          { owner }
        ),
      },
      { owner }
    );
    return newList;
  }
}
