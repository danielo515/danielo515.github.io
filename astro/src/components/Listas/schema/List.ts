import { CoList, CoMap, type Group, co } from "jazz-tools";

type ShoppingListItem = {
  readonly name: string;
  readonly quantity: number;
  readonly emoji: string | null;
};

type Completed = {
  _tag: 'completed';
  completedAt: Date;
};

type Pending = {
  _tag: 'pending';
};

export class ListItem extends CoMap {
  name = co.string;
  quantity = co.number;
  emoji = co.string;
  status = co.json<Pending | Completed>();
  addedAt = co.Date;

  complete = () => {
    this.status = { _tag: 'completed', completedAt: new Date() };
  };

  uncomplete = () => {
    this.status = { _tag: 'pending' };
  };
}

class ListItems extends CoList.Of(co.ref(ListItem)) { }

export class ListEntry extends CoMap {
  items = co.ref(ListItems);
  type = co.literal('todo', 'shopping');

  static make({ items, owner, addedAt }: {
    items: ShoppingListItem[];
    owner: Group;
    addedAt: Date;
  }) {
    const newList = ListEntry.create({
      items: ListItems
        .create(
          items.map(({ emoji, name, quantity }) =>
            ListItem.create({
              name,
              quantity,
              emoji: emoji ?? '',
              addedAt,
              status: { _tag: 'pending' },
            }, { owner })
          ),
          { owner },
        ),
      type: 'shopping',
    }, { owner });
    return newList;
  }
}
