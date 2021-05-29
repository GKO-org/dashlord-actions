import orderBy from "lodash.orderby";
import Tooltip from "rc-tooltip";
import "rc-tooltip/assets/bootstrap.css";
import * as React from "react";
import { useMemo, useState } from "react";
import BaseTable, { AutoResizer, Column, SortOrder } from "react-base-table";
import "react-base-table/styles.css";
import { AlertTriangle, Info, Search, Slash } from "react-feather";
import { Link } from "react-router-dom";
import { AccessibilityWarnings } from "../lib/lighthouse/AccessibilityWarnings";
import { isToolEnabled, smallUrl, letterGradeValue } from "../utils";
import { Grade } from "./Grade";

type DashboardProps = { report: DashLordReport };

const IconUnknown = () => <Slash size={20} />;

type ColumnHeaderProps = {
  title: string;
  info: string;
  warning?: React.ReactNode;
};

const ColumnHeader: React.FC<ColumnHeaderProps> = ({
  title,
  info,
  warning,
}) => (
  <div style={{ textAlign: "center" }}>
    <span style={{ fontSize: "0.9em" }}>
      {title}
      <br />
      <Tooltip
        placement="bottom"
        trigger={["hover"]}
        overlay={<div style={{ maxWidth: 300 }}>{info}</div>}
      >
        <Info size={16} style={{ cursor: "pointer" }} />
      </Tooltip>
    </span>

    {warning && (
      <Tooltip
        placement="bottom"
        trigger={["hover"]}
        overlay={<div style={{ maxWidth: 300 }}>{warning}</div>}
      >
        <AlertTriangle
          size={16}
          style={{
            stroke: "var(--danger)",
            marginLeft: 5,
            cursor: "pointer",
          }}
        />
      </Tooltip>
    )}
  </div>
);

type SortState = {
  key: string;
  order: SortOrder;
  column: { [column: string]: string };
};

const defaultSort = {
  key: "url",
  order: "asc",
  column: { dataKey: "url" },
} as SortState;

const percent = (num: number | undefined): string =>
  (num !== undefined && Math.floor(num * 100) + " %") || "-";

const defaultColumnProps = {
  width: 120,
  sortable: true,
  align: "center",
} as {
  width: number;
  sortable: boolean;
  align: "center" | "left" | "right";
};

const lighthouseColumnProps = ({
  id,
  title,
  info,
  warning,
}: {
  id: string;
  title: string;
  info: string;
  warning?: any;
}) => ({
  headerRenderer: () => {
    return <ColumnHeader title={title} info={info} warning={warning} />;
  },
  dataGetter: ({ rowData }: { rowData: any }) => {
    const summary = (rowData as UrlReport).summary;
    const scoreKey = `lighthouse_${id}`;
    //@ts-expect-error
    if (summary[scoreKey] === undefined) {
      return -1;
    }
    //@ts-expect-error
    return summary[scoreKey];
  },
  cellRenderer: ({ rowData }: { rowData: any }) => {
    const summary = (rowData as UrlReport).summary;
    const gradeKey = `lighthouse_${id}Grade`;
    const scoreKey = `lighthouse_${id}`;
    return (
      <GradeBadge
        //@ts-expect-error
        grade={summary[gradeKey]}
        //@ts-expect-error
        label={percent(summary[scoreKey])}
      />
    );
  },
});

const GradeBadge = ({
  grade,
  label,
}: {
  grade: string | undefined;
  label?: string | number | undefined;
}) => (grade ? <Grade small grade={grade} label={label} /> : <IconUnknown />);

export const Dashboard: React.FC<DashboardProps> = ({ report }) => {
  const [sortBy, setSortBy] = useState(defaultSort);
  const onColumnSort = (column: any) => {
    setSortBy(column);
  };

  const sortedReport = useMemo(() => {
    const getSortedRows = (rows: any) => {
      return orderBy(
        rows,
        (row) => {
          if (sortBy.column.dataGetter) {
            //@ts-expect-error
            return sortBy.column.dataGetter({ rowData: row });
          } else if (sortBy.column.key) {
            return row[sortBy.column.key];
          }
        },
        sortBy.order
      );
    };

    return getSortedRows(report);
  }, [sortBy, report]);

  return (
    <div style={{ width: "100%", height: "calc(100vh - 30px)" }}>
      <AutoResizer>
        {({ width, height }) => (
          <BaseTable
            data={sortedReport}
            width={width}
            height={height}
            sortBy={sortBy}
            onColumnSort={onColumnSort}
          >
            <Column
              key="url"
              title="url"
              sortable={true}
              width={300}
              flexGrow={1}
              cellRenderer={({ rowData }) => (
                <Link
                  to={`/url/${encodeURIComponent((rowData as UrlReport).url)}`}
                >
                  <Search size={16} />
                  &nbsp;{smallUrl((rowData as UrlReport).url)}
                </Link>
              )}
            />
            {isToolEnabled("lighthouse") && (
              <Column
                {...defaultColumnProps}
                key="accessibility"
                {...lighthouseColumnProps({
                  id: "accessibility",
                  title: "Accessibilité",
                  info: "Bonnes pratiques en matière d'accessibilité web (LightHouse)",
                  warning: <AccessibilityWarnings />,
                })}
              />
            )}
            {isToolEnabled("lighthouse") && (
              <Column
                {...defaultColumnProps}
                key="performance"
                {...lighthouseColumnProps({
                  id: "performance",
                  title: "Performance",
                  info: "Performances de chargement des pages web (LightHouse)",
                })}
              />
            )}
            {isToolEnabled("lighthouse") && (
              <Column
                {...defaultColumnProps}
                key="seo"
                {...lighthouseColumnProps({
                  id: "seo",
                  title: "SEO",
                  info: "Bonnes pratiques en matière de référencement naturel (LightHouse)",
                })}
              />
            )}

            {isToolEnabled("testssl") && (
              <Column
                {...defaultColumnProps}
                key="ssl"
                dataGetter={({ rowData }: { rowData: any }) => {
                  const summary = (rowData as UrlReport).summary;
                  return (
                    (summary.testsslGrade &&
                      letterGradeValue(summary.testsslGrade)) ||
                    -1
                  );
                }}
                headerRenderer={() => (
                  <ColumnHeader
                    title="SSL"
                    info="Niveau de confiance du certificat SSL (testssl.sh)"
                  />
                )}
                cellRenderer={({ rowData }) => {
                  const summary = (rowData as UrlReport).summary;
                  return <GradeBadge grade={summary.testsslGrade} />;
                }}
              />
            )}

            {isToolEnabled("http") && (
              <Column
                {...defaultColumnProps}
                key="http"
                dataGetter={({ rowData }) => {
                  const summary = (rowData as UrlReport).summary;
                  return (
                    (summary.httpGrade &&
                      letterGradeValue(summary.httpGrade)) ||
                    -1
                  );
                }}
                headerRenderer={() => (
                  <ColumnHeader
                    title="HTTP"
                    info="Bonnes pratiques de configuration HTTP (Mozilla observatory)"
                  />
                )}
                cellRenderer={({ rowData }) => {
                  const summary = (rowData as UrlReport).summary;
                  return <GradeBadge grade={summary.httpGrade} />;
                }}
              />
            )}

            {isToolEnabled("updownio") && (
              <Column
                {...defaultColumnProps}
                key="updownio"
                dataGetter={({ rowData }) => {
                  const summary = (rowData as UrlReport).summary;
                  return summary.uptime || -1;
                }}
                headerRenderer={() => (
                  <ColumnHeader
                    title="Disponibilité"
                    info="Disponibilité du service (updown.io)"
                  />
                )}
                cellRenderer={({ rowData }) => {
                  const summary = (rowData as UrlReport).summary;
                  return (
                    <GradeBadge
                      grade={summary.uptimeGrade}
                      label={percent((summary.uptime || 0) / 100)}
                    />
                  );
                }}
              />
            )}
            {isToolEnabled("updownio") && (
              <Column
                {...defaultColumnProps}
                key="updownio2"
                dataGetter={({ rowData }) => {
                  const summary = (rowData as UrlReport).summary;
                  return summary.apdex || -1;
                }}
                headerRenderer={() => (
                  <ColumnHeader
                    title="apdex"
                    info="Apdex: Application Performance Index : indice de satisfaction des attentes de performance (updown.io)"
                  />
                )}
                cellRenderer={({ rowData }) => {
                  const summary = (rowData as UrlReport).summary;
                  return (
                    <GradeBadge
                      grade={summary.apdexGrade}
                      label={summary.apdex}
                    />
                  );
                }}
              />
            )}

            {isToolEnabled("dependabot") && (
              <Column
                {...defaultColumnProps}
                key="dependabot"
                dataGetter={({ rowData }) => {
                  const summary = (rowData as UrlReport).summary;
                  return summary.dependabotCount;
                }}
                headerRenderer={() => (
                  <ColumnHeader
                    title="Vulnérabilités"
                    info="Vulnérabilités applicatives detectées dans les dépendances du code (dependabot)"
                  />
                )}
                cellRenderer={({ rowData }) => {
                  const summary = (rowData as UrlReport).summary;
                  return (
                    <GradeBadge
                      grade={summary.dependabotGrade}
                      label={summary.dependabotCount}
                    />
                  );
                }}
              />
            )}

            {isToolEnabled("nmap") && (
              <Column
                {...defaultColumnProps}
                key="nmap"
                dataGetter={({ rowData }) => {
                  const summary = (rowData as UrlReport).summary;
                  return summary.nmapCount;
                }}
                headerRenderer={() => (
                  <ColumnHeader
                    title="Nmap"
                    info="Vulnérabilités réseau detectées par Nmap"
                  />
                )}
                cellRenderer={({ rowData }) => {
                  const summary = (rowData as UrlReport).summary;
                  return (
                    <GradeBadge
                      grade={summary.nmapGrade}
                      label={summary.nmapCount}
                    />
                  );
                }}
              />
            )}

            {isToolEnabled("codescan") && (
              <Column
                {...defaultColumnProps}
                key="codescan"
                dataGetter={({ rowData }) => {
                  const summary = (rowData as UrlReport).summary;
                  return summary.codescanCount;
                }}
                headerRenderer={() => (
                  <ColumnHeader
                    title="CodeQL"
                    info="Potentielles vulnérabilités ou erreurs detectées dans les codes sources (codescan)"
                  />
                )}
                cellRenderer={({ rowData }) => {
                  const summary = (rowData as UrlReport).summary;
                  return (
                    <GradeBadge
                      grade={summary.codescanGrade}
                      label={summary.codescanCount}
                    />
                  );
                }}
              />
            )}

            {isToolEnabled("thirdparties") && (
              <Column
                {...defaultColumnProps}
                key="trackers"
                dataGetter={({ rowData }) => {
                  const summary = (rowData as UrlReport).summary;
                  return summary.trackersCount;
                }}
                headerRenderer={() => (
                  <ColumnHeader
                    title="Trackers"
                    info="Nombre de scripts externes détectés"
                    warning={
                      <div>
                        Certains scripts externes légitimes peuvent être
                        considérés comme trackers.
                      </div>
                    }
                  />
                )}
                cellRenderer={({ rowData }) => {
                  const summary = (rowData as UrlReport).summary;
                  return (
                    <GradeBadge
                      grade={summary.trackersGrade}
                      label={summary.trackersCount}
                    />
                  );
                }}
              />
            )}
            {isToolEnabled("thirdparties") && (
              <Column
                {...defaultColumnProps}
                key="cookies"
                dataGetter={({ rowData }) => {
                  const summary = (rowData as UrlReport).summary;
                  return summary.cookiesCount;
                }}
                headerRenderer={() => (
                  <ColumnHeader
                    title="Cookies"
                    info="Nombre de cookies présents"
                  />
                )}
                cellRenderer={({ rowData }) => {
                  const summary = (rowData as UrlReport).summary;
                  return (
                    <GradeBadge
                      grade={summary.cookiesGrade}
                      label={summary.cookiesCount}
                    />
                  );
                }}
              />
            )}
          </BaseTable>
        )}
      </AutoResizer>
    </div>
  );
};
