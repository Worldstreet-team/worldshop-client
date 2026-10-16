import { forwardRef, type FormHTMLAttributes } from "react";
import { useNavigate } from "react-router-dom";

/*
 * next/form: a GET form whose `action` is a path navigates client-side to
 * action?fields, as Next's <Form> does. A function action is a plain React form action.
 */

type FormProps = Omit<FormHTMLAttributes<HTMLFormElement>, "action"> & {
  action: string | ((formData: FormData) => void | Promise<void>);
  replace?: boolean;
  scroll?: boolean;
  prefetch?: boolean;
};

type SubmitEvent = Parameters<NonNullable<FormHTMLAttributes<HTMLFormElement>["onSubmit"]>>[0];

const Form = forwardRef<HTMLFormElement, FormProps>(function Form({ action, replace, scroll, prefetch: _p, onSubmit, ...rest }, ref) {
  const navigate = useNavigate();
  if (typeof action !== "string") return <form ref={ref} action={action} onSubmit={onSubmit} {...rest} />;
  const submit = (e: SubmitEvent) => {
    onSubmit?.(e);
    if (e.defaultPrevented) return;
    e.preventDefault();
    const qs = new URLSearchParams();
    new FormData(e.currentTarget).forEach((v, k) => {
      if (typeof v === "string") qs.append(k, v);
    });
    const search = qs.toString();
    navigate(`${action}${search ? `?${search}` : ""}`, { replace, preventScrollReset: scroll === false });
  };
  return <form ref={ref} action={action} onSubmit={submit} {...rest} />;
});

export default Form;
