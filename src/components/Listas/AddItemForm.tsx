import { Check, Plus, X } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

interface AddItemFormProps {
  onAddItem: (name: string) => void;
}

export const AddItemForm = ({ onAddItem }: AddItemFormProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [itemName, setItemName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;
    onAddItem(itemName.trim());
    setItemName("");
    setIsExpanded(false);
  };

  const handleCancel = () => {
    setItemName("");
    setIsExpanded(false);
  };

  return (
    <motion.div 
      className="mt-4"
      layout
    >
      <motion.div 
        className="overflow-hidden"
        layout
      >
        {isExpanded ? (
          <motion.form
            initial={{ y: -20, opacity: 0 }}
            animate={{ 
              y: 0,
              opacity: 1,
              transition: { 
                duration: 0.2,
                ease: "easeOut"
              } 
            }}
            exit={{ 
              y: -20,
              opacity: 0,
              transition: { 
                duration: 0.2,
                ease: "easeIn"
              }
            }}
            className="flex gap-2 h-[52px]"
            onSubmit={handleSubmit}
          >
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Add new item..."
              className="flex-grow p-2 rounded-lg bg-gray-50 dark:bg-gray-800 
                       border-2 border-blue-200 dark:border-blue-700
                       focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-800
                       text-gray-900 dark:text-gray-100"
              autoFocus
            />
            <button
              type="submit"
              className="h-full aspect-square rounded-lg bg-blue-500 dark:bg-blue-600 text-white
                       hover:bg-blue-600 dark:hover:bg-blue-700
                       active:bg-blue-700 dark:active:bg-blue-800
                       focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-800
                       flex items-center justify-center"
            >
              <Check className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="h-full aspect-square rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300
                       hover:bg-red-200 dark:hover:bg-red-800/40
                       active:bg-red-300 dark:active:bg-red-700/50
                       focus:outline-none focus:ring-2 focus:ring-red-100 dark:focus:ring-red-800
                       flex items-center justify-center"
            >
              <X className="w-6 h-6" />
            </button>
          </motion.form>
        ) : (
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ 
              y: 0,
              opacity: 1,
              transition: { 
                duration: 0.2,
                ease: "easeOut"
              } 
            }}
            exit={{ 
              y: 20,
              opacity: 0,
              transition: { 
                duration: 0.2,
                ease: "easeIn"
              }
            }}
            onClick={() => setIsExpanded(true)}
            className="w-full h-[52px] rounded-lg bg-gray-50 dark:bg-gray-800 
                     hover:bg-gray-100 dark:hover:bg-gray-700
                     active:bg-gray-200 dark:active:bg-gray-600
                     focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-800
                     flex items-center justify-center gap-2
                     text-gray-900 dark:text-gray-100"
          >
            <Plus className="w-6 h-6" />
            <span>Add Item</span>
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
};
