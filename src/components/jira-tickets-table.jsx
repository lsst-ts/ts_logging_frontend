import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import LinkIcon from "../assets/LinkIcon.svg";

function JiraTicketsTable({ tickets, loading = false }) {
  return (
    <div className="overflow-x-auto">
      <Table className="w-full">
        <TableHeader>
          <TableRow className="[&>th]:!text-white [&>th]:text-lg">
            <TableHead>Number</TableHead>
            <TableHead colSpan={3}>Summary</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead className="text-right">Link</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center">
                Loading tickets...
              </TableCell>
            </TableRow>
          ) : tickets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center">
                No tickets found.
              </TableCell>
            </TableRow>
          ) : (
            tickets.map((ticket) => (
              <TableRow key={ticket.key}>
                <TableCell className="font-medium">
                  <span>{ticket.key}</span>
                  {ticket.isNew && (
                    <span className=" text-lime-400 text-xs px-2 py-1 rounded-full">
                      New
                    </span>
                  )}
                </TableCell>
                <TableCell colSpan={3} className="!text-wrap break-normal">
                  {ticket.summary}
                </TableCell>
                <TableCell>{ticket.status}</TableCell>
                <TableCell>{ticket.created}</TableCell>
                <TableCell>{ticket.updated}</TableCell>
                <TableCell className="text-right">
                  <a
                    href={ticket.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    <img
                      src={LinkIcon}
                      alt="View Ticket"
                      className="inline-block w-6 h-6"
                    />
                  </a>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default JiraTicketsTable;
