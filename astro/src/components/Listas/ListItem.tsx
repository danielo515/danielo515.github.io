import { animate } from "motion";
import { useState, useRef } from "react";
import { Checkbox } from "./Checkbox";
import { Trash2 } from "lucide-react";

interface ListItemProps {
  id: string;
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  onDelete: () => void;
}

export function ListItem({ id, checked, label, onChange, onDelete }: ListItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [dragX, setDragX] = useState(0);
  const itemRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    // Only handle clicks on the main container, not on children
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('list-item-container')) {
      onChange(!checked);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  const handleDragEnd = async (dx: number) => {
    const threshold = -100; // Negative because we're dragging left
    
    if (dx < threshold) {
      setShowConfirm(true);
    } else {
      // Reset position
      animate(itemRef.current, { x: 0 }, { duration: 0.2 });
    }
    setIsDragging(false);
    setDragX(0);
  };

  const confirmDelete = async () => {
    await animate(itemRef.current, { x: -1000, opacity: 0 }, { duration: 0.3 });
    onDelete();
  };

  const cancelDelete = async () => {
    setShowConfirm(false);
    animate(itemRef.current, { x: 0 }, { duration: 0.2 });
  };

  return (
    <div className="relative overflow-hidden rounded-lg list-item-container" onClick={handleClick}>
      {/* Red background that shows when dragging */}
      <div className="absolute inset-0 bg-red-500 flex items-center justify-end pr-8">
        <Trash2 className="w-6 h-6 text-white" onClick={handleDelete} />
      </div>

      {/* Draggable content */}
      <div
        ref={itemRef}
        className="relative bg-gray-50 dark:bg-gray-800 touch-pan-y"
        onPointerDown={(e) => {
          if (showConfirm) return; // Don't allow dragging while confirming
          setIsDragging(true);
          const target = e.currentTarget;
          const startX = e.clientX;

          const onPointerMove = (e: PointerEvent) => {
            const dx = Math.min(0, e.clientX - startX); // Only allow dragging left
            setDragX(dx);
            animate(target, { x: dx }, { duration: 0, easing: [0.2, 0, 0.3, 1] });
          };

          const onPointerUp = (e: PointerEvent) => {
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
            const finalDx = e.clientX - startX;
            handleDragEnd(finalDx);
          };

          document.addEventListener('pointermove', onPointerMove);
          document.addEventListener('pointerup', onPointerUp);
        }}
      >
        <Checkbox
          id={id}
          checked={checked}
          label={label}
          onChange={onChange}
          className="hover:bg-gray-100 dark:hover:bg-gray-700 
                    active:bg-gray-200 dark:active:bg-gray-600 shadow-sm"
        />
      </div>

      {/* Confirmation overlay */}
      {showConfirm && (
        <div
          className="absolute inset-0 flex items-center justify-end gap-2 bg-gray-50/90 
                     dark:bg-gray-800/90 rounded-lg px-4 animate-in fade-in duration-200"
        >
          <button
            onClick={cancelDelete}
            className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 
                     dark:text-gray-300 text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={confirmDelete}
            className="px-3 py-1 rounded bg-red-500 text-white text-sm 
                     hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
