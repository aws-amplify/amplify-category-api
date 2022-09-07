import { Flex, Heading } from '@aws-amplify/ui-react';
import { createCreateRecordComponent, createDetailComponent, createEditComp, createGetRecordComponent, createListComponent, createViewComp } from './CRUDLComponents';

type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;

export type createCRUDLControlsProps<T> = {
  recordName: string;
  fields: (keyof T)[];
  createMutation: string;
  updateMutation: string;
  deleteMutation: string;
  getQuery: string;
  listQuery: string;
  sentinelData: DeepPartial<T>;
};

export const createCRUDLControls = <T extends object>(props: createCRUDLControlsProps<T>) => {
  const CreateComp = createCreateRecordComponent(props);
  const ViewComp = createViewComp<T>(props);
  const EditComp = createEditComp<T>(props);
  const DetailComp = createDetailComponent({
    ...props,
    ViewComp,
    EditComp,
  });
  const GetComp = createGetRecordComponent({
    ...props,
    DetailComp,
  });
  
  const ListComp = createListComponent({
    ...props,
    DetailComp,
  });

  return () => {
    return (
      <Flex direction='column'>
        <Heading level={2}>CRUDL Actions</Heading>
        <CreateComp />
        <GetComp />
        <ListComp />
      </Flex>
    );
  };
};



