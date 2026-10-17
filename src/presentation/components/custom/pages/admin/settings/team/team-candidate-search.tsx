import { type JSX, useState } from "react"

import { useQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { searchTeamCandidatesQuery } from "~/src/modules/user/use-cases/search-team-candidates"
import { TEAM_CANDIDATE_SEARCH_MIN_LENGTH } from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"

import { useDebounce } from "~/src/hooks/use-debounce"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Field, FieldDescription } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"

import { AdminDialogNote } from "~/src/presentation/components/custom/pages/admin/admin-dialog-note"
import { CatalogFormFieldLabel } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-label"
import { SettingsStatusBadge } from "~/src/presentation/components/custom/pages/admin/settings/settings-status-badge"

const SEARCH_DEBOUNCE_MS = 300

const isEligible = (candidate: User["teamCandidate"]): boolean => candidate.emailVerified && !candidate.banned

const CandidateRow = ({ candidate, onChoose }: Readonly<CandidateRowProps>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.team.add")

  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0 space-y-1">
        <p className="truncate text-[13px] leading-5 font-medium text-foreground">{candidate.name}</p>
        <p className="truncate text-[12px] text-muted-foreground">{candidate.email}</p>
        {!candidate.emailVerified && <SettingsStatusBadge label={t("unverified")} tone="warning" />}
        {candidate.banned && <SettingsStatusBadge label={t("banned")} tone="negative" />}
      </div>
      <Button
        aria-label={t("chooseLabel", { name: candidate.name })}
        className="shrink-0"
        disabled={!isEligible(candidate)}
        onClick={() => {
          onChoose(candidate)
        }}
        size="sm"
        type="button"
        variant="outline"
      >
        {t("choose")}
      </Button>
    </li>
  )
}

const CandidateResults = ({ candidates, onChoose }: Readonly<CandidateResultsProps>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.team.add")

  if (candidates === undefined) {
    return <p className="text-[13px] text-muted-foreground">{t("searching")}</p>
  }

  if (candidates.length === 0) {
    return <p className="text-[13px] leading-relaxed text-muted-foreground">{t("noResults")}</p>
  }

  return (
    <div>
      <ul aria-label={t("search")} className="divide-y divide-border/60">
        {candidates.map((candidate) => (
          <CandidateRow candidate={candidate} key={candidate.id} onChoose={onChoose} />
        ))}
      </ul>
      {candidates.some((candidate) => !candidate.emailVerified) && <AdminDialogNote kind="warning">{t("unverifiedHint")}</AdminDialogNote>}
      {candidates.some((candidate) => candidate.banned) && <AdminDialogNote kind="warning">{t("bannedHint")}</AdminDialogNote>}
    </div>
  )
}

export const TeamCandidateSearch = ({ onChoose }: Readonly<Pick<CandidateRowProps, "onChoose">>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.team.add")
  const [search, setSearch] = useState("")
  const term = useDebounce(search, SEARCH_DEBOUNCE_MS).trim()
  const searching = term.length >= TEAM_CANDIDATE_SEARCH_MIN_LENGTH
  const { data: candidates } = useQuery({ ...searchTeamCandidatesQuery(term), enabled: searching })

  return (
    <>
      <Field className="gap-2">
        <CatalogFormFieldLabel label={t("search")} required />
        <Input
          aria-label={t("search")}
          autoComplete="off"
          onChange={(event) => {
            setSearch(event.target.value)
          }}
          placeholder={t("searchPlaceholder")}
          type="search"
          value={search}
          variant="sheet"
        />
        <FieldDescription>{t("searchHint")}</FieldDescription>
      </Field>
      {searching && <CandidateResults candidates={candidates} onChoose={onChoose} />}
    </>
  )
}

interface CandidateRowProps {
  readonly candidate: User["teamCandidate"]
  readonly onChoose: (candidate: User["teamCandidate"]) => void
}

interface CandidateResultsProps {
  readonly candidates: readonly User["teamCandidate"][] | undefined
  readonly onChoose: CandidateRowProps["onChoose"]
}
