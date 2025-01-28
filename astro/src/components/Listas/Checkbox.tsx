interface CheckboxProps {
    disabled?: boolean;
    defaultChecked?: boolean;
    checked: boolean;
    id: string;
    label: string;
    onChange: (toggled: boolean) => unknown;
    stopPropagation?: boolean;
}

export const Checkbox = (props: CheckboxProps) => {
  const handleChange = (e: React.MouseEvent<HTMLInputElement>) => {
    if (props.stopPropagation) {
      e.stopPropagation();
    }
    props.onChange(!props.checked);
  };

  return (
    <div className="w-full flex gap-3 items-center relative select-none" onClick={e => props.stopPropagation && e.stopPropagation()}>
      <div className="relative">
        <input
          className="
            peer relative appearance-none shrink-0 w-6 h-6 border-2 border-blue-200 dark:border-blue-700 rounded-md 
            bg-gray-50 dark:bg-gray-800
            focus:outline-none focus:ring-offset-0 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-800
            checked:bg-blue-500 dark:checked:bg-blue-600 checked:border-0
            disabled:border-steel-400 disabled:bg-steel-400
            transition-colors duration-200
          "
          type="checkbox"
          {...props}
          onClick={handleChange}
          onChange={() => {}}
        />
        <svg
          className="absolute w-6 h-6 pointer-events-none hidden peer-checked:block stroke-white left-0 top-0"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <label
        htmlFor={props.id}
        className={`flex-grow text-lg text-gray-900 dark:text-gray-100 ${props.checked ? 'text-gray-500 dark:text-gray-400 line-through' : ''}`}
        onClick={e => props.stopPropagation && e.stopPropagation()}
      >
        {props.label}
      </label>
    </div>
  );
};