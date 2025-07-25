import { JazzProvider, useCoState } from "jazz-react";
import type { ID } from "jazz-tools";
import { useState } from "react";
import { AddItemForm } from "./AddItemForm";
import { ListItem } from "./ListItem";
import { ListEntry } from "./schema/List";

export default function Lists() {
  const [listID, _setIssueID] = useState<ID<ListEntry> | undefined>(
    (window.location.search?.replace("?list=", "") || undefined) as
      | ID<ListEntry>
      | undefined
  );

  if (listID) {
    return (
      <JazzProvider
        peer="wss://cloud.jazz.tools/?key=react-demo-auth-tailwind@garden.co"
        auth={"guest"}
      >
        <List list={listID} />
      </JazzProvider>
    );
  }

  return (
    <div className="text-center font-bold">
      Could not find any list to load. Please check the URL
    </div>
  );
}

export function List({ list: listID }: { list: ID<ListEntry> }) {
  const list = useCoState(ListEntry, listID, { items: [{}] });
  const remaining =
    list?.items?.filter((_) => _?.status._tag === "completed").length ?? 0;
  return (
    list && (
      <div className="flex flex-col gap-5 items-stretch">
        <h2 className="text-2xl grid grid-cols-3 gap-3">
          <span className="col-span-2">
            {list.type === "shopping"
              ? "Lista de la compra"
              : "Lista de tareas"}
          </span>
          <span className="text-center">
            {remaining}/{list.items?.length}
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
        {list.items == null ? (
          <div>The list appears to be empty. Maybe a permissions issue</div>
        ) : (
          <ul className="flex flex-col gap-3">
            {list.items.map((item) => {
              return (
                <li key={item.id}>
                  <ListItem
                    id={`${item.id}-checkbox`}
                    checked={item.status._tag === "completed"}
                    label={`${item.emoji} ${item.name}`}
                    onChange={(checked) =>
                      checked ? item.complete() : item.uncomplete()
                    }
                    onDelete={() => {
                      const itemIdx = list.items.findIndex(
                        (i) => i.id === item.id
                      );
                      console.log(itemIdx, list.items);
                      if (itemIdx >= 0) {
                        list.items.splice(itemIdx, 1);
                      }
                      console.log(list.items);
                    }}
                  />
                </li>
              );
            })}
            <li>
              <AddItemForm
                onAddItem={(name) => {
                  list.items.add(
                    { name, emoji: "📝", quantity: 1 },
                    new Date()
                  );
                }}
              />
            </li>
          </ul>
        )}
      </div>
    )
  );
}
