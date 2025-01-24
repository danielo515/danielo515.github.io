
interface CheckboxProps {
    disabled?: boolean;
    defaultChecked?: boolean;
    checked: boolean;
    id: string;
    label: string;
    onChange: (toggled: boolean) => unknown;
  }

export const Checkbox = (props: CheckboxProps) => (
    <div className="w-full flex gap-2 items-center relative">
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
          onChange={() => {
            return props.onChange(!props.checked);
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