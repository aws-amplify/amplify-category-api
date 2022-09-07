import { Button, Card, Collection, Flex, Heading, TextField } from '@aws-amplify/ui-react';
import { API, graphqlOperation } from 'aws-amplify';
import _ from 'lodash';
import pluralize from 'pluralize';
import { useState } from 'react';
import { OperationStateIndicator, useOperationStateWrapper } from '.';

type DetailState = 'view' | 'edit';

export type SimpleIdRecord<T> = T & { id: string };
export type SimpleIdRecordProps<T> = { record: SimpleIdRecord<T> };
export type RecordComponentType<T> = (props: SimpleIdRecordProps<T>) => JSX.Element;

export type createDetailComponentProps<T> = {
  deleteMutation: string;
  recordName: string;
  ViewComp: RecordComponentType<T>;
  EditComp: RecordComponentType<T>;
};

export const createDetailComponent = <T extends any>({ deleteMutation, recordName, ViewComp, EditComp }: createDetailComponentProps<T>): RecordComponentType<T> => {
  const capitalizedRecordName = _.capitalize(recordName)
  return ({ record }: {record: any & { id: string }}) => {
    const { wrappedFn, opState } = useOperationStateWrapper(async () => await API.graphql(graphqlOperation(deleteMutation, { input: { id: record.id } })));
    const [detailState, setDetailState] = useState<DetailState>('view');
  
    return (
      <Card variation='elevated'>
        <Heading level={5}>{ capitalizedRecordName }</Heading>
        <span>ID: { record.id }</span>
        { detailState === 'view'
          ? <ViewComp record={record} />
          : <EditComp record={record} />
        }
        <Button id={`delete-${recordName}`} size='small' onClick={wrappedFn}>Delete</Button>
        <OperationStateIndicator id={`${recordName}-is-deleted`} state={opState} />
        { detailState === 'view'
          ? <Button size='small' onClick={() => setDetailState('edit')}>Edit</Button>
          : <Button size='small' onClick={() => setDetailState('view')}>View</Button>
        }
      </Card>
    );
  };
};

export type createCreateRecordComponentProps = {
  recordName: string;
  createMutation: string;
  sentinelData: any;
};

export const createCreateRecordComponent = ({ recordName, createMutation, sentinelData }: createCreateRecordComponentProps) => {
  const capitalizedRecordName = _.capitalize(recordName);
  return () => {
    const { wrappedFn, opState } = useOperationStateWrapper(async () => await API.graphql(graphqlOperation(createMutation, { input: { ...sentinelData, id } })));
    const [id, setId] = useState('');
  
    return (
      <Flex direction='column'>
        <Heading level={3}>Create A { capitalizedRecordName }</Heading>
        <Flex direction='row'>
          <TextField id={`${recordName}-id-input`} label='Test Id' onChange={(event: any) => { setId(event.target.value) }}/>
          <Button id={`${recordName}-create`} onClick={wrappedFn}>Create { capitalizedRecordName }</Button>
          <OperationStateIndicator id={`${recordName}-is-created`} state={opState} />
        </Flex>
      </Flex>
    );
  };
};

export type createGetComponentProps<T> = {
  getQuery: string;
  recordName: string;
  DetailComp: RecordComponentType<T>;
};

export const createGetRecordComponent = <T extends any>({ getQuery, recordName, DetailComp }: createGetComponentProps<T>) => {
  const getRecordDataLoc = _.camelCase(`get ${recordName}`);
  const capitalizedRecordName = _.capitalize(recordName);
  return () => {
    const [retrievedRecord, setRecord] = useState<T | undefined>();
    const [id, setId] = useState('');
    const { wrappedFn, opState } = useOperationStateWrapper(async () => {
      const response = await API.graphql(graphqlOperation(getQuery, { id }));
      // @ts-ignore
      setRecord(response.data[getRecordDataLoc]);
    });

    return (
      <Flex direction='column'>
        <Heading level={3}>Get A { capitalizedRecordName }</Heading>
        <Flex direction='row'>
          <TextField id={`retrieve-${recordName}-id`} label={`${capitalizedRecordName} Id`} onChange={(event: any) => { setId(event.target.value) }}/>
          <Button id={`retrieve-${recordName}-button`} onClick={wrappedFn}>Get { capitalizedRecordName }</Button>
          <OperationStateIndicator id={`${recordName}-is-retrieved`} state={opState} />
        </Flex>
        <div id={`retrieved-${recordName}`}>
          { retrievedRecord && <DetailComp record={retrievedRecord as SimpleIdRecord<T>} /> }
        </div>
      </Flex>
    );
  };
};

export type createListComponentProps<T> = {
  listQuery: string;
  recordName: string;
  DetailComp: RecordComponentType<T>;
};

export const createListComponent = <T extends any>({ listQuery, recordName, DetailComp }: createListComponentProps<T>) => {
  const listRecordsDataLoc = _.camelCase(`list ${pluralize(recordName)}`);
  const pluralizedRecordName = pluralize(recordName);
  const capitalizedPluralizedRecordName = _.capitalize(pluralizedRecordName);
  return () => {
    const [records, setRecords] = useState<SimpleIdRecord<T>[]>([]);
    const { wrappedFn, opState } = useOperationStateWrapper(async () => {
      const response = await API.graphql({ query: listQuery }) as any;
      setRecords(response.data[listRecordsDataLoc].items);
    });
  
    return (
      <Flex direction='column'>
        <Heading level={3}>List { capitalizedPluralizedRecordName }</Heading>
        <Flex direction='row'>
          <Button id={`list-${pluralizedRecordName}`} onClick={wrappedFn}>Load { capitalizedPluralizedRecordName }</Button>
          <OperationStateIndicator id={`${pluralizedRecordName}-are-listed`} state={opState} />
        </Flex>
        <div id={`listed-${pluralizedRecordName}`}>
          <Collection
            items={records}
            type='list'
            direction='column'
            gap='20px'
            wrap='nowrap'
          >
            { (record: SimpleIdRecord<T>) => <DetailComp key={record.id} record={record} /> }
          </Collection>
        </div>
      </Flex>
    );
  };
};
