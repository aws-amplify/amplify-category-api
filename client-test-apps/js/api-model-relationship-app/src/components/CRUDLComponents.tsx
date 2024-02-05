import { Button, Card, Collection, Flex, Heading, TextField } from '@aws-amplify/ui-react';
import { API } from 'aws-amplify';
import _ from 'lodash';
import pluralize from 'pluralize';
import { useState } from 'react';
import { OperationStateIndicator, useOperationStateWrapper } from '.';
import { HarnessContext, HarnessContextType } from './HarnessContext';

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
  return ({ record }: SimpleIdRecordProps<T>) => {
    const { wrappedFn, opState } = useOperationStateWrapper(async ({ authMode }: HarnessContextType) => await API.graphql({ query: deleteMutation, variables: { input: { id: record.id } }, authMode }));
    const [detailState, setDetailState] = useState<DetailState>('view');
  
    return (
      <HarnessContext.Consumer>
        { context => 
          <Card variation='elevated'>
            <Heading level={5}>{ capitalizedRecordName }</Heading>
            <span>ID: { record.id }</span>
            { detailState === 'view'
              ? <ViewComp record={record} />
              : <EditComp record={record} />
            }
            <Button id={`delete-${recordName}`} size='small' onClick={async () => { await wrappedFn(context); }}>Delete</Button>
            <OperationStateIndicator id={`${recordName}-is-deleted`} state={opState} />
            { detailState === 'view'
              ? <Button size='small' onClick={() => setDetailState('edit')}>Edit</Button>
              : <Button size='small' onClick={() => setDetailState('view')}>View</Button>
            }
          </Card>
        }
      </HarnessContext.Consumer>
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
    const { wrappedFn, opState } = useOperationStateWrapper(async ({ authMode }: HarnessContextType) => await API.graphql({ query: createMutation, variables: { input: { ...sentinelData, id } }, authMode }));
    const [id, setId] = useState('');
  
    return (
      <HarnessContext.Consumer>
        { context => 
          <Flex direction='column'>
            <Heading level={3}>Create A { capitalizedRecordName }</Heading>
            <Flex direction='row'>
              <TextField id={`${recordName}-id-input`} label='Test Id' onChange={(event: any) => { setId(event.target.value) }}/>
              <Button id={`${recordName}-create`} onClick={async () => { await wrappedFn(context); }}>Create { capitalizedRecordName }</Button>
              <OperationStateIndicator id={`${recordName}-is-created`} state={opState} />
            </Flex>
          </Flex>
        }
      </HarnessContext.Consumer>
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
    const { wrappedFn, opState } = useOperationStateWrapper(async ({ authMode }: HarnessContextType) => {
      const response = await API.graphql({ query: getQuery, variables: { id }, authMode});
      // @ts-ignore
      setRecord(response.data[getRecordDataLoc]);
    });

    return (
      <HarnessContext.Consumer>
        { context => 
          <Flex direction='column'>
            <Heading level={3}>Get A { capitalizedRecordName }</Heading>
            <Flex direction='row'>
              <TextField id={`retrieve-${recordName}-id`} label={`${capitalizedRecordName} Id`} onChange={(event: any) => { setId(event.target.value) }}/>
              <Button id={`retrieve-${recordName}-button`} onClick={async () => { await wrappedFn(context); }}>Get { capitalizedRecordName }</Button>
              <OperationStateIndicator id={`${recordName}-is-retrieved`} state={opState} />
            </Flex>
            <div id={`retrieved-${recordName}`}>
              { retrievedRecord && <DetailComp record={retrievedRecord as SimpleIdRecord<T>} /> }
            </div>
          </Flex>
        }
      </HarnessContext.Consumer>
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
    const { wrappedFn, opState } = useOperationStateWrapper(async ({ authMode }: HarnessContextType) => {
      const response = await API.graphql({ query: listQuery, authMode }) as any;
      setRecords(response.data[listRecordsDataLoc].items);
    });
  
    return (
      <HarnessContext.Consumer>
        { context => 
          <Flex direction='column'>
            <Heading level={3}>List { capitalizedPluralizedRecordName }</Heading>
            <Flex direction='row'>
              <Button id={`list-${pluralizedRecordName}`} onClick={async () => { await wrappedFn(context); }}>Load { capitalizedPluralizedRecordName }</Button>
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
        }
      </HarnessContext.Consumer>
    );
  };
};

export type createViewCompProps<T> = {
  recordName: string;
  fields: (keyof T)[];
};

export const createViewComp = <T extends object>({ recordName, fields }: createViewCompProps<T>): RecordComponentType<T> => {
  return ({ record }: SimpleIdRecordProps<T>) => {
    return (
      <ul>
        { fields.map((field) => <li key={`${recordName}-${String(field)}`}>{ `${String(field)}: ${JSON.stringify(record[field])}`}</li> )}
      </ul>
    );
  };
};

export type createEditCompProps<T> = {
  recordName: string;
  updateMutation: string;
  fields: (keyof T)[];
};

export const createEditComp = <T extends object>({ updateMutation, fields, recordName }: createEditCompProps<T>): RecordComponentType<T> => {
  return ({ record }: SimpleIdRecordProps<T>) => {
    const [updatedFields, setUpdatedFields] = useState({});
    const { wrappedFn, opState } = useOperationStateWrapper(async ({ authMode }: HarnessContextType) => await API.graphql({ query: updateMutation, variables: { input: { ...updatedFields, id: record.id} }, authMode }));
  
    const updateField = (fieldName: keyof T, updatedValue: string) => {
      setUpdatedFields((oldFields) => ({ ...oldFields, [fieldName]: updatedValue }));
    };

    return (
      <HarnessContext.Consumer>
        { context => 
          <Flex direction='row'>
            { fields.map(field => { return (
              <TextField
                key={`${recordName}-${String(field)}`}
                id={`update-${String(field)}-input`}
                label={_.capitalize(String(field))}
                placeholder={ String(record[field]) || '' }
                onChange={(event: any) => {
                  updateField(field, event.target.value);
                }}
              />
            ) }) }
            <Button id={`update-${recordName}`} onClick={async () => { await wrappedFn(context); }}>Update</Button>
            <OperationStateIndicator id={`${recordName}-is-updated`} state={opState} />
          </Flex>
        }
      </HarnessContext.Consumer>
    );
  };
};
