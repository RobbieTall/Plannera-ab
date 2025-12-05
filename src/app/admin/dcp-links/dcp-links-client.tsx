"use client";

import type React from "react";
import Link from "next/link";
import { useFormState } from "react-dom";

import {
  ActionState,
  createDevelopmentControlPlanLink,
  deleteDevelopmentControlPlanLink,
  initialState,
  updateDevelopmentControlPlanLink,
} from "./actions";

type DevelopmentControlPlanLink = {
  id: string;
  lgaCode: string;
  name: string;
  url: string;
};

type Props = {
  links: DevelopmentControlPlanLink[];
  token: string;
};

const FormMessage = ({ state }: { state: ActionState }) => {
  if (state.error) {
    return <p className="text-xs text-red-600">{state.error}</p>;
  }

  if (state.message) {
    return <p className="text-xs text-green-600">{state.message}</p>;
  }

  return null;
};

const EditableLinkRow = ({ link, token }: { link: DevelopmentControlPlanLink; token: string }) => {
  const [updateState, updateFormAction] = useFormState(updateDevelopmentControlPlanLink, initialState);
  const [deleteState, deleteFormAction] = useFormState(deleteDevelopmentControlPlanLink, initialState);
  const formId = `update-${link.id}`;

  const handleDelete = (event: React.FormEvent<HTMLFormElement>) => {
    if (!window.confirm("Delete this DCP link?")) {
      event.preventDefault();
    }
  };

  return (
    <>
      <form id={formId} action={updateFormAction} className="hidden">
        <input type="hidden" name="id" value={link.id} />
        <input type="hidden" name="token" value={token} />
      </form>
      <tr className="border-t border-slate-100 text-slate-800">
        <td className="px-4 py-3 align-top">
          <input
            className="w-full rounded border border-slate-200 px-2 py-1 text-sm font-semibold text-slate-900 focus:border-slate-400 focus:outline-none"
            defaultValue={link.lgaCode}
            form={formId}
            name="lgaCode"
            aria-label="LGA code"
          />
        </td>
        <td className="px-4 py-3 align-top">
          <input
            className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
            defaultValue={link.name}
            form={formId}
            name="name"
            aria-label="Name"
          />
        </td>
        <td className="px-4 py-3 align-top">
          <div className="flex flex-col gap-1">
            <input
              className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              defaultValue={link.url}
              form={formId}
              name="url"
              aria-label="URL"
            />
            <Link className="text-xs text-blue-700 underline" href={link.url} target="_blank" rel="noreferrer">
              Open link
            </Link>
          </div>
        </td>
        <td className="px-4 py-3 align-top text-right">
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <button
                className="rounded border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-slate-400"
                form={formId}
                type="submit"
              >
                Save
              </button>
              <form action={deleteFormAction} onSubmit={handleDelete} className="inline">
                <input type="hidden" name="id" value={link.id} />
                <input type="hidden" name="token" value={token} />
                <button
                  className="rounded border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:border-red-400"
                  type="submit"
                >
                  Delete
                </button>
              </form>
            </div>
            <div className="flex flex-col items-end gap-1 text-right">
              <FormMessage state={updateState} />
              <FormMessage state={deleteState} />
            </div>
          </div>
        </td>
      </tr>
    </>
  );
};

export const DcpLinksManager = ({ links, token }: Props) => {
  const [createState, createFormAction] = useFormState(createDevelopmentControlPlanLink, initialState);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-2 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Development Control Plan Links</h1>
          <p className="text-sm text-slate-600">Manage LGA DCP links available to the workspace.</p>
        </div>
        <p className="text-xs text-slate-500">Changes are saved immediately and are used by the workspace without a restart.</p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <p className="text-sm font-semibold text-slate-800">Existing links</p>
        </div>
        {links.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-600">No links have been added yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">LGA Code</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">URL</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <EditableLinkRow key={link.id} link={link} token={token} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">Add new link</h2>
        <p className="mb-4 text-xs text-slate-500">Enter a unique LGA code, the council name, and the DCP URL.</p>
        <form action={createFormAction} className="grid grid-cols-1 gap-4 md:grid-cols-4 md:items-end">
          <input type="hidden" name="token" value={token} />
          <label className="flex flex-col gap-1 text-sm text-slate-800">
            LGA Code
            <input
              className="rounded border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-slate-400 focus:outline-none"
              name="lgaCode"
              placeholder="BYRON"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-800 md:col-span-1">
            Name
            <input
              className="rounded border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              name="name"
              placeholder="Byron Shire Council"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-800 md:col-span-2">
            URL
            <input
              className="rounded border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              name="url"
              placeholder="https://example.gov.au/dcp"
              required
              type="url"
            />
          </label>
          <button
            className="w-full rounded border border-slate-200 bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:border-slate-400 md:w-auto"
            type="submit"
          >
            Add link
          </button>
        </form>
        <div className="mt-2">
          <FormMessage state={createState} />
        </div>
      </section>
    </div>
  );
};

export default DcpLinksManager;
