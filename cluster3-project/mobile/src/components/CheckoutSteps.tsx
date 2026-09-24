/**
 * @file The checkout's three-step indicator: Cart, Shipping, Payment.
 */
import './CheckoutSteps.css';

const STEPS = ['Cart', 'Shipping', 'Payment'] as const;

/** Props for {@link CheckoutSteps}. */
export interface CheckoutStepsProps {
  /** The current step, 1-based. */
  current: number;
}

/**
 * Class list for one step.
 *
 * @param step - The step's 1-based number.
 * @param current - The current step.
 * @returns The class attribute value.
 */
function stepClass(step: number, current: number): string {
  if (step === current) return 'checkout-steps__step is-active';
  if (step < current) return 'checkout-steps__step is-done';
  return 'checkout-steps__step';
}

/**
 * Render the step indicator.
 *
 * @param props - The current step.
 * @returns The indicator.
 */
export default function CheckoutSteps({ current }: CheckoutStepsProps) {
  return (
    <div className="checkout-steps">
      <ol className="checkout-steps__track" aria-label={`Checkout step ${current} of ${STEPS.length}`}>
        {STEPS.map((label, index) => {
          const step = index + 1;
          return (
            <li
              key={label}
              className={stepClass(step, current)}
              aria-label={`Step ${step}: ${label}`}
              aria-current={step === current ? 'step' : undefined}
            >
              <span className="checkout-steps__number" aria-hidden="true">
                {step}
              </span>
              {step < STEPS.length ? <span className="checkout-steps__line" aria-hidden="true" /> : null}
            </li>
          );
        })}
      </ol>
      <span className="checkout-steps__label">{STEPS[current - 1]}</span>
    </div>
  );
}
