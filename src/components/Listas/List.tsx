import { JazzReactProvider, useCoState } from "jazz-tools/react";
import { useState } from "react";
import { AddItemForm } from "./AddItemForm";
import { ListItem } from "./ListItem";
import {
  ListEntry,
  addItem,
  completeItem,
  uncompleteItem,
} from "./schema/List";

export default function Lists() {
  const [listID] = useState<string | undefined>(
    window.location.search?.replace("?list=", "") || undefined
  );

  if (listID) {
    return (
      <JazzReactProvider
        sync={{
          peer: "wss://cloud.jazz.tools/?key=react-demo-auth-tailwind@garden.co",
        }}
        guestMode
      >
        <List list={listID} />
      </JazzReactProvider>
    );
  }

  return (
    <div className="text-center font-bold">
      Could not find any list to load. Please check the URL
    </div>
  );
}

export function List({ list: listID }: { list: string }) {
  const list = useCoState(ListEntry, listID, {
    resolve: { items: { $each: true } },
  });

  if (!list.$isLoaded) {
    return null;
  }

  const items = list.items;
  const remaining =
    items?.filter((item) => item?.status._tag === "completed").length ?? 0;

  return (
    <div className="flex flex-col gap-5 items-stretch">
      <h2 className="text-2xl grid grid-cols-3 gap-3">
        <span className="col-span-2">
          {list.type === "shopping" ? "Lista de la compra" : "Lista de tareas"}
        </span>
        <span className="text-center">
          {remaining}/{items?.length}
        </span>
      </h2>
      <p className="text-sm text-gray-500 italic -mt-3 mb-2">
        {list.createdAt
          ? new Date(list.createdAt).toLocaleDateString("es-ES", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Fecha desconocida"}
      </p>
      {items == null ? (
        <div>The list appears to be empty. Maybe a permissions issue</div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => {
            return (
              <li key={item.$jazz.id}>
                <ListItem
                  id={`${item.$jazz.id}-checkbox`}
                  checked={item.status._tag === "completed"}
                  label={`${item.emoji} ${item.name}`}
                  onChange={(checked) =>
                    checked ? completeItem(item) : uncompleteItem(item)
                  }
                  onDelete={() => {
                    const itemIdx = items.findIndex(
                      (i) => i.$jazz.id === item.$jazz.id
                    );
                    if (itemIdx >= 0) {
                      items.$jazz.remove(itemIdx);
                    }
                  }}
                />
              </li>
            );
          })}
          <li>
            <AddItemForm
              onAddItem={(name) => {
                addItem(
                  items,
                  { name, emoji: "📝", quantity: 1 },
                  new Date()
                );
              }}
            />
          </li>
        </ul>
      )}
    </div>
  );
}
