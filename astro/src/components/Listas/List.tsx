import { JazzProvider, useCoState } from "jazz-react";
import type { ID } from "jazz-tools";
import { useState } from "react";
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

interface CheckboxProps {
  disabled?: boolean;
  defaultChecked?: boolean;
  value: boolean;
  id: string;
  label: string;
  onChange: (toggled: boolean) => unknown;
}

const Checkbox = ({ value, ...props }: CheckboxProps) => (
  <div className="w-full flex gap-2 items-center">
    <div className="relative">
      <input
        className="
          peer relative appearance-none shrink-0 w-4 h-4 border-2 border-blue-200 rounded-sm bg-white
          focus:outline-none focus:ring-offset-0 focus:ring-1 focus:ring-blue-100
          checked:bg-blue-500 checked:border-0
          disabled:border-steel-400 disabled:bg-steel-400
        "
        type="checkbox"
        {...props}
        checked={value}
        onChange={() => {
          return props.onChange(!value);
        }}
      />
      <svg
        className="absolute w-4 h-4 pointer-events-none hidden peer-checked:block stroke-white left-0 top-0"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
    <label htmlFor={props.id} className="peer-checked:line-through">
      {props.label}
    </label>
  </div>
);

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
                    value={item.status._tag === 'completed'}
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
