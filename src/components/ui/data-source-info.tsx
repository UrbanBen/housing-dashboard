import * as React from "react";
import { Cross2Icon, InfoCircledIcon } from "@radix-ui/react-icons";
import { ABSDataSource } from "@/lib/abs-data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

interface DataSourceInfoProps {
  dataSource: ABSDataSource;
}

export function DataSourceInfo({ dataSource }: DataSourceInfoProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-6 w-6"
          aria-label="Data source information"
        >
          <InfoCircledIcon className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Data Source Information</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Detailed information about the data displayed in this chart
          </p>
        </DialogHeader>
        
        <div className="grid gap-4">
          <div className="grid gap-2">
            <h3 className="text-sm font-semibold text-foreground">Publication</h3>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium">{dataSource.title}</p>
              <p>{dataSource.publishDate}</p>
            </div>
          </div>
          
          <div className="grid gap-2">
            <h3 className="text-sm font-semibold text-foreground">Description</h3>
            <p className="text-sm text-muted-foreground">{dataSource.description}</p>
          </div>
          
          <div className="grid gap-2">
            <h3 className="text-sm font-semibold text-foreground">Methodology</h3>
            <p className="text-sm text-muted-foreground">{dataSource.methodology}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <h3 className="text-sm font-semibold text-foreground">Release Frequency</h3>
              <p className="text-sm text-muted-foreground">{dataSource.frequency}</p>
            </div>
            <div className="grid gap-2">
              <h3 className="text-sm font-semibold text-foreground">Next Release</h3>
              <p className="text-sm text-muted-foreground">{dataSource.nextRelease}</p>
            </div>
          </div>
          
          <div className="grid gap-2">
            <h3 className="text-sm font-semibold text-foreground">Original Source</h3>
            <a 
              href={dataSource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline break-all"
            >
              {dataSource.url}
            </a>
          </div>
        </div>
        
        <div className="flex justify-end">
          <DialogClose asChild>
            <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
              Close
            </button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}