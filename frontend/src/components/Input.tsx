import { cn } from '../utils/cn';
import { type InputHTMLAttributes, forwardRef } from 'react';
import { components } from '../styles/design-system';

/**
 * Input Component
 *
 * A comprehensive form input component with label, helper text,
 * and error message support. Uses the design system for consistent styling.
 *
 * @example
 * ```tsx
 * <Input label="Email" placeholder="Enter your email" />
 * <Input label="Password" type="password" error="Password is required" />
 * <Input label="Amount" inputSize="lg" helperText="Enter the transaction amount" />
 * ```
 */

type InputSize = 'sm' | 'md' | 'lg';
type InputState = 'default' | 'error' | 'success';

// Custom interface that extends InputHTMLAttributes but handles size conflict
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Input label text */
  label?: string;
  /** Helper text displayed below input */
  helperText?: string;
  /** Error message - triggers error styling when provided */
  error?: string;
  /** Input size variant - renamed to avoid conflict with HTML size attribute */
  inputSize?: InputSize;
  /** Visual state of the input */
  state?: InputState;
  /** Icon to display on the left side */
  leftIcon?: React.ReactNode;
  /** Icon to display on the right side */
  rightIcon?: React.ReactNode;
  /** Full width input */
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      inputSize = 'md',
      state = 'default',
      leftIcon,
      rightIcon,
      fullWidth = true,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    // Generate unique ID if not provided
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    // Determine state based on error prop
    const inputState: InputState = error ? 'error' : state;

    // Get size classes from design system
    const sizeClasses = components.input.sizes[inputSize];

    // Get state classes
    const stateClasses =
      inputState === 'error'
        ? components.input.states.error
        : inputState === 'success'
        ? components.input.states.success
        : '';

    return (
      <div className={cn(fullWidth && 'w-full')}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className={cn(components.input.label)}
          >
            {label}
          </label>
        )}

        {/* Input wrapper with optional icons */}
        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
              {leftIcon}
            </div>
          )}

          {/* Input element */}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              // Base input styles from design system
              components.input.base,
              // Size variant
              sizeClasses,
              // State variant (error/success)
              stateClasses,
              // Left icon padding
              leftIcon && 'pl-10',
              // Right icon padding
              rightIcon && 'pr-10',
              className
            )}
            disabled={disabled}
            aria-invalid={inputState === 'error'}
            aria-describedby={
              error
                ? `${inputId}-error`
                : helperText
                ? `${inputId}-helper`
                : undefined
            }
            {...props}
          />

          {/* Right Icon */}
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
              {rightIcon}
            </div>
          )}
        </div>

        {/* Helper Text */}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className={cn(components.input.helper)}>
            {helperText}
          </p>
        )}

        {/* Error Message */}
        {error && (
          <p
            id={`${inputId}-error`}
            className={cn(components.input.errorText)}
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// ============================================
// TEXTAREA COMPONENT
// ============================================

interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  state?: InputState;
  fullWidth?: boolean;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      state = 'default',
      fullWidth = true,
      id,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const inputId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    const inputState: InputState = error ? 'error' : state;

    const stateClasses =
      inputState === 'error'
        ? components.input.states.error
        : inputState === 'success'
        ? components.input.states.success
        : '';

    return (
      <div className={cn(fullWidth && 'w-full')}>
        {label && (
          <label htmlFor={inputId} className={cn(components.input.label)}>
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className={cn(
            components.input.base,
            'min-h-[100px] resize-y',
            stateClasses,
            className
          )}
          aria-invalid={inputState === 'error'}
          aria-describedby={
            error
              ? `${inputId}-error`
              : helperText
              ? `${inputId}-helper`
              : undefined
          }
          {...props}
        />

        {helperText && !error && (
          <p id={`${inputId}-helper`} className={cn(components.input.helper)}>
            {helperText}
          </p>
        )}

        {error && (
          <p
            id={`${inputId}-error`}
            className={cn(components.input.errorText)}
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';

// ============================================
// SELECT COMPONENT
// ============================================

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  inputSize?: InputSize;
  state?: InputState;
  fullWidth?: boolean;
  options: SelectOption[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      inputSize = 'md',
      state = 'default',
      fullWidth = true,
      options,
      placeholder,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
    const inputState: InputState = error ? 'error' : state;

    const sizeClasses = components.input.sizes[inputSize];
    const stateClasses =
      inputState === 'error'
        ? components.input.states.error
        : inputState === 'success'
        ? components.input.states.success
        : '';

    return (
      <div className={cn(fullWidth && 'w-full')}>
        {label && (
          <label htmlFor={inputId} className={cn(components.input.label)}>
            {label}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={cn(
              components.input.base,
              sizeClasses,
              stateClasses,
              'appearance-none pr-10 cursor-pointer',
              className
            )}
            aria-invalid={inputState === 'error'}
            aria-describedby={
              error
                ? `${inputId}-error`
                : helperText
                ? `${inputId}-helper`
                : undefined
            }
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>

          {/* Custom dropdown arrow */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        {helperText && !error && (
          <p id={`${inputId}-helper`} className={cn(components.input.helper)}>
            {helperText}
          </p>
        )}

        {error && (
          <p
            id={`${inputId}-error`}
            className={cn(components.input.errorText)}
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

// ============================================
// EXPORTS
// ============================================

export { Input, TextArea, Select };
export type { InputProps, TextAreaProps, SelectProps, InputSize, InputState, SelectOption };
