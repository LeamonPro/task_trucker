// src/utils/index.js

/**
 * A utility to conditionally join class names together.
 * @param  {...any} classes - Class names to join.
 * @returns {string} A string of class names.
 */
export const cn = (...classes) => classes.filter(Boolean).join(' ');


export const TASK_TYPE_OPTIONS = [
    { value: 'preventif', label: 'Preventif' },
    { value: 'curatif', label: 'Curatif' },
    { value: 'visite hierarchique', label: 'Visite Hierarchique' },
];

/**
 * Gets the display label for a given task type value.
 * @param {string} value - The task type value (e.g., 'preventif').
 * @returns {string} The display label.
 */
export const getTaskTypeLabel = (value) => {
    const option = TASK_TYPE_OPTIONS.find(opt => opt.value === value);
    return option ? option.label : value;
};
