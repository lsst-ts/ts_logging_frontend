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
    <div className="w-full">
      <Table className="w-full table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="sticky top-0 z-10 !text-white text-lg">
              Number
            </TableHead>
            <TableHead
              colSpan={2}
              className="sticky top-0 z-10 !text-white text-lg"
            >
              Summary
            </TableHead>
            <TableHead className="sticky top-0 z-10 !text-white text-lg">
              Status
            </TableHead>
            <TableHead className="sticky top-0 z-10 !text-white text-lg">
              Created
            </TableHead>
            <TableHead className="sticky top-0 z-10 !text-white text-lg">
              Last Updated
            </TableHead>
            <TableHead className="sticky top-0 z-10 !text-white text-lg text-right">
              Link
            </TableHead>
          </TableRow>
        </TableHeader>
      </Table>
      <div className="max-h-96 overflow-y-auto w-full">
        <Table className="w-full table-fixed">
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Loading tickets...
                </TableCell>
              </TableRow>
            ) : tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  No tickets found.
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => (
                <TableRow key={ticket.key}>
                  <TableCell className="font-medium">
                    <span>{ticket.key}</span>
                    {ticket.isNew && (
                      <span className="ml-1 bg-amber-500 text-black text-xs p-1 rounded-full">
                        New
                      </span>
                    )}
                  </TableCell>
                  <TableCell colSpan={2} className="!text-wrap break-normal">
                    {ticket.summary}
                  </TableCell>
                  <TableCell>{ticket.status}</TableCell>
                  <TableCell className="!text-wrap">{ticket.created}</TableCell>
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
    </div>
  );
}

export default JiraTicketsTable;
