import { JazzProvider, useCoState } from "jazz-react";
import type { ID } from "jazz-tools";
import { useState } from "react";
import { Checkbox } from "./Checkbox";
import { ListEntry } from "./schema/List";

export default function Lists() {
  const [listID, _setIssueID] = useState<ID<ListEntry> | undefined>(
    (window.location.search?.replace("?list=", "") || undefined) as
    | ID<ListEntry>
    | undefined,
  );

  if (listID) {
    return ( 
    <JazzProvider peer="wss://cloud.jazz.tools/?key=react-demo-auth-tailwind@garden.co" auth={'guest'} >
    <List list={listID} />
    </JazzProvider> )
  }

  return <div className="text-center font-bold">Could not find any list to load. Please check the URL</div>;
}

export function List({ list: listID }: { list: ID<ListEntry> }) {

  const list = useCoState(ListEntry, listID, { items: [{}] });
  const remaining = list?.items?.filter(_ => _?.status._tag === 'completed').length ?? 0;
  return list && (
    <div className="flex flex-col gap-5 items-stretch">
      <h2 className="text-2xl grid grid-cols-3 gap-3">
        <span className="col-span-2">
          {list.type === 'shopping' ? 'Lista de la compra' : 'Lista de tareas'}
        </span>
        <span className="text-center">{remaining}/{list.items?.length}</span>
      </h2>
      {list.items == null ? (
        <div>The list appears to be empty. Maybe a permissions issue</div>
      ) : (
        <ul className="flex flex-col gap-3">
          {

            list.items.map((item) => {
              if (!item) return;
              return (
                <li key={item.id} >
                  <Checkbox
                    id={`${item.id}-checkbox`}
                    checked={item.status._tag === 'completed'}
                    label={`${item.emoji} ${item.name}`}

                    onChange={(e) => {
                      console.log('new status', e)
                      if (e) {
                        return item.complete()
                      }
                      console.log('Hola puta')
                      item.uncomplete()
                    }}
                  ></Checkbox>
                </li>
              );
            })
          }
        </ul>
      )}
    </div>
  );
}
