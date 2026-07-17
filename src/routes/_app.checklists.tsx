import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/checklists")({
  loader: () => {
    throw redirect({ href: "/planos-manutencao" });
  },
});
