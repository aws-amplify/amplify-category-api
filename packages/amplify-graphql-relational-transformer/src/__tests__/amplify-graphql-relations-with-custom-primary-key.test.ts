import { IndexTransformer, PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { ObjectTypeDefinitionNode, parse } from 'graphql';
import { AuthTransformer } from '@aws-amplify/graphql-auth-transformer';
import { testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { BelongsToTransformer, HasManyTransformer, HasOneTransformer, ManyToManyTransformer } from '..';

describe('custom primary key and relational directives', () => {
  it('uses primary key name for hasOne relational connection field', () => {
    const inputSchema = `
      type Patient @model {
        ssn: ID! @primaryKey
        givenName: String
        familyName: String
      }

      type MedicalAppointment @model {
        appointmentReference: ID! @primaryKey
        patient: Patient @hasOne
        provider: String
        date: AWSDateTime
      }
    `;

    const out = testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
    });

    expect(out).toBeDefined();
    const schema = parse(out.schema);
    validateModelSchema(schema);

    const medicalAppointment = schema.definitions.find((def: any) => def.name && def.name.value === 'MedicalAppointment') as any;
    expect(medicalAppointment).toBeDefined();
    const ssnConnectionField = medicalAppointment.fields.find((f: any) => f.name.value === 'medicalAppointmentPatientSsn');
    const idConnectionField = medicalAppointment.fields.find((f: any) => f.name.value === 'medicalAppointmentPatientId');

    expect(ssnConnectionField).toBeDefined();
    expect(idConnectionField).not.toBeDefined();
  });

  it('uses primary key name for hasOne and belongsTo relational connection field', () => {
    const inputSchema = `
      type Patient @model {
        ssn: ID! @primaryKey
        givenName: String
        familyName: String
        medicalAppointment: MedicalAppointment @belongsTo
      }

      type MedicalAppointment @model {
        appointmentReference: ID! @primaryKey
        patient: Patient @hasOne
        provider: String
        date: AWSDateTime
      }
    `;

    const out = testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
    });

    expect(out).toBeDefined();
    const schema = parse(out.schema);
    validateModelSchema(schema);

    const medicalAppointment = schema.definitions.find((def: any) => def.name && def.name.value === 'MedicalAppointment') as any;
    expect(medicalAppointment).toBeDefined();
    const medicalAppointmentSsnConnectionField = medicalAppointment.fields.find(
      (f: any) => f.name.value === 'medicalAppointmentPatientSsn',
    );
    const medicalAppointmentIdConnectionField = medicalAppointment.fields.find((f: any) => f.name.value === 'medicalAppointmentPatientId');

    expect(medicalAppointmentSsnConnectionField).toBeDefined();
    expect(medicalAppointmentIdConnectionField).not.toBeDefined();

    const patient = schema.definitions.find((def: any) => def.name && def.name.value === 'Patient') as any;
    expect(patient).toBeDefined();
    const patientAppointmentReferenceConnectionField = patient.fields.find(
      (f: any) => f.name.value === 'patientMedicalAppointmentAppointmentReference',
    );
    const patientIdConnectionField = patient.fields.find((f: any) => f.name.value === 'patientMedicalAppointmentId');

    expect(patientAppointmentReferenceConnectionField).toBeDefined();
    expect(patientIdConnectionField).not.toBeDefined();
  });

  it('uses primary key name for hasMany relational connection field', () => {
    const inputSchema = `
      type Patient @model {
        ssn: ID! @primaryKey
        givenName: String
        familyName: String
        medicalAppointments: [MedicalAppointment] @hasMany
      }

      type MedicalAppointment @model {
        appointmentReference: ID! @primaryKey
        provider: String
        date: AWSDateTime
      }
    `;

    const out = testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasManyTransformer(), new BelongsToTransformer()],
    });

    expect(out).toBeDefined();
    const schema = parse(out.schema);
    validateModelSchema(schema);

    const medicalAppointment = schema.definitions.find((def: any) => def.name && def.name.value === 'MedicalAppointment') as any;
    expect(medicalAppointment).toBeDefined();
    const ssnConnectionField = medicalAppointment.fields.find((f: any) => f.name.value === 'patientMedicalAppointmentsSsn');
    const idConnectionField = medicalAppointment.fields.find((f: any) => f.name.value === 'patientMedicalAppointmentsId');

    expect(ssnConnectionField).toBeDefined();
    expect(idConnectionField).not.toBeDefined();
  });

  it('uses primary key name for hasMany with belongsTo relational connection field', () => {
    const inputSchema = `
      type Patient @model {
        ssn: ID! @primaryKey
        givenName: String
        familyName: String
        medicalAppointments: [MedicalAppointment] @hasMany
      }

      type MedicalAppointment @model {
        appointmentReference: ID! @primaryKey
        provider: String
        date: AWSDateTime
        patient: Patient @belongsTo
      }
    `;

    const out = testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasManyTransformer(), new BelongsToTransformer()],
    });

    expect(out).toBeDefined();
    const schema = parse(out.schema);
    validateModelSchema(schema);

    const medicalAppointment = schema.definitions.find((def: any) => def.name && def.name.value === 'MedicalAppointment') as any;
    expect(medicalAppointment).toBeDefined();
    const ssnConnectionField = medicalAppointment.fields.find((f: any) => f.name.value === 'patientMedicalAppointmentsSsn');
    const idConnectionField = medicalAppointment.fields.find((f: any) => f.name.value === 'patientMedicalAppointmentsId');

    expect(ssnConnectionField).toBeDefined();
    expect(idConnectionField).not.toBeDefined();
  });

  it('adds hasOne sortKeyFields connection fields', () => {
    const inputSchema = `
      type Patient @model {
        ssn: ID! @primaryKey(sortKeyFields: ["givenName", "familyName"])
        givenName: String!
        familyName: String!
      }

      type MedicalAppointment @model {
        appointmentReference: ID! @primaryKey
        patient: Patient @hasOne
        provider: String
        date: AWSDateTime
      }
    `;

    const out = testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
    });

    expect(out).toBeDefined();
    const schema = parse(out.schema);
    validateModelSchema(schema);

    const medicalAppointment = schema.definitions.find((def: any) => def.name && def.name.value === 'MedicalAppointment') as any;
    expect(medicalAppointment).toBeDefined();
    const ssnConnectionField = medicalAppointment.fields.find((f: any) => f.name.value === 'medicalAppointmentPatientSsn');
    const idConnectionField = medicalAppointment.fields.find((f: any) => f.name.value === 'medicalAppointmentPatientId');

    const givenNameConnectionField = medicalAppointment.fields.find((f: any) => f.name.value === 'medicalAppointmentPatientGivenName');
    const familyNameConnectionField = medicalAppointment.fields.find((f: any) => f.name.value === 'medicalAppointmentPatientFamilyName');

    expect(ssnConnectionField).toBeDefined();
    expect(idConnectionField).not.toBeDefined();

    expect(givenNameConnectionField).toBeDefined();
    expect(familyNameConnectionField).toBeDefined();

    const medicalAppointmentFilterInput = schema.definitions.find(
      (def: any) => def.name && def.name.value === 'ModelMedicalAppointmentFilterInput',
    ) as any;
    const medicalAppointmentConditionInput = schema.definitions.find(
      (def: any) => def.name && def.name.value === 'ModelMedicalAppointmentConditionInput',
    ) as any;
    const medicalAppointmentCreateInput = schema.definitions.find(
      (def: any) => def.name && def.name.value === 'CreateMedicalAppointmentInput',
    ) as any;
    const medicalAppointmentUpdateInput = schema.definitions.find(
      (def: any) => def.name && def.name.value === 'UpdateMedicalAppointmentInput',
    ) as any;
    const medicalAppointmentSubscriptionFilterInput = schema.definitions.find(
      (def: any) => def.name && def.name.value === 'ModelSubscriptionMedicalAppointmentFilterInput',
    ) as any;

    expect(medicalAppointmentFilterInput).toBeDefined();
    expect(medicalAppointmentConditionInput).toBeDefined();
    expect(medicalAppointmentCreateInput).toBeDefined();
    expect(medicalAppointmentUpdateInput).toBeDefined();
    expect(medicalAppointmentSubscriptionFilterInput).toBeDefined();

    const inputs = [
      medicalAppointmentFilterInput,
      medicalAppointmentConditionInput,
      medicalAppointmentCreateInput,
      medicalAppointmentUpdateInput,
    ];

    inputs.forEach((it) => {
      const ssnInputField = it.fields.find((f: any) => f.name.value === 'medicalAppointmentPatientSsn');
      const givenNameInputField = it.fields.find((f: any) => f.name.value === 'medicalAppointmentPatientGivenName');
      const familyNameInputField = it.fields.find((f: any) => f.name.value === 'medicalAppointmentPatientFamilyName');

      expect(ssnInputField).toBeDefined();
      expect(givenNameInputField).toBeDefined();
      expect(familyNameInputField).toBeDefined();
    });

    // test subscription filter input has correct types
    const ssnInputField = medicalAppointmentSubscriptionFilterInput.fields.find(
      (f: any) => f.name.value === 'medicalAppointmentPatientSsn',
    );
    const givenNameInputField = medicalAppointmentSubscriptionFilterInput.fields.find(
      (f: any) => f.name.value === 'medicalAppointmentPatientGivenName',
    );
    const familyNameInputField = medicalAppointmentSubscriptionFilterInput.fields.find(
      (f: any) => f.name.value === 'medicalAppointmentPatientFamilyName',
    );

    expect(ssnInputField).toBeDefined();
    expect(ssnInputField.type.name.value).toEqual('ModelSubscriptionIDInput');
    expect(givenNameInputField).toBeDefined();
    expect(givenNameInputField.type.name.value).toEqual('ModelSubscriptionStringInput');
    expect(familyNameInputField).toBeDefined();
    expect(familyNameInputField.type.name.value).toEqual('ModelSubscriptionStringInput');
  });

  it('adds belongsTo sortKeyFields connection fields', () => {
    const inputSchema = `
      type Patient @model {
        ssn: ID! @primaryKey
        givenName: String
        familyName: String
        medicalAppointment: MedicalAppointment @belongsTo
      }

      type MedicalAppointment @model {
        appointmentReference: ID! @primaryKey(sortKeyFields: ["provider"])
        patient: Patient @hasOne
        provider: String!
        date: AWSDateTime
      }
    `;

    const out = testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
    });

    expect(out).toBeDefined();
    const schema = parse(out.schema);
    validateModelSchema(schema);

    const medicalAppointment = schema.definitions.find((def: any) => def.name && def.name.value === 'MedicalAppointment') as any;
    expect(medicalAppointment).toBeDefined();
    const medicalAppointmentSsnConnectionField = medicalAppointment.fields.find(
      (f: any) => f.name.value === 'medicalAppointmentPatientSsn',
    );
    const medicalAppointmentIdConnectionField = medicalAppointment.fields.find((f: any) => f.name.value === 'medicalAppointmentPatientId');

    expect(medicalAppointmentSsnConnectionField).toBeDefined();
    expect(medicalAppointmentIdConnectionField).not.toBeDefined();

    const patient = schema.definitions.find((def: any) => def.name && def.name.value === 'Patient') as any;
    expect(patient).toBeDefined();
    const patientAppointmentReferenceConnectionField = patient.fields.find(
      (f: any) => f.name.value === 'patientMedicalAppointmentAppointmentReference',
    );
    const patientIdConnectionField = patient.fields.find((f: any) => f.name.value === 'patientMedicalAppointmentId');

    expect(patientAppointmentReferenceConnectionField).toBeDefined();
    expect(patientIdConnectionField).not.toBeDefined();

    const providerConnectionField = patient.fields.find((f: any) => f.name.value === 'patientMedicalAppointmentProvider');
    expect(providerConnectionField).toBeDefined();

    const patientFilterInput = schema.definitions.find((def: any) => def.name && def.name.value === 'ModelPatientFilterInput') as any;
    const patientConditionInput = schema.definitions.find((def: any) => def.name && def.name.value === 'ModelPatientConditionInput') as any;
    const patientCreateInput = schema.definitions.find((def: any) => def.name && def.name.value === 'CreatePatientInput') as any;
    const patientUpdateInput = schema.definitions.find((def: any) => def.name && def.name.value === 'UpdatePatientInput') as any;
    const patientSubscriptionFilterInput = schema.definitions.find(
      (def: any) => def.name && def.name.value === 'ModelSubscriptionPatientFilterInput',
    ) as any;

    expect(patientFilterInput).toBeDefined();
    expect(patientConditionInput).toBeDefined();
    expect(patientCreateInput).toBeDefined();
    expect(patientUpdateInput).toBeDefined();
    expect(patientSubscriptionFilterInput).toBeDefined();

    const inputs = [patientFilterInput, patientConditionInput, patientCreateInput, patientUpdateInput];

    inputs.forEach((it) => {
      const primaryKeyConnectionField = it.fields.find((f: any) => f.name.value === 'patientMedicalAppointmentAppointmentReference');
      const sortKeyConnectionField = it.fields.find((f: any) => f.name.value === 'patientMedicalAppointmentProvider');

      expect(primaryKeyConnectionField).toBeDefined();
      expect(sortKeyConnectionField).toBeDefined();
    });

    // test subscription filter input has correct types
    const primaryKeyConnectionField = patientSubscriptionFilterInput.fields.find(
      (f: any) => f.name.value === 'patientMedicalAppointmentAppointmentReference',
    );
    const sortKeyConnectionField = patientSubscriptionFilterInput.fields.find(
      (f: any) => f.name.value === 'patientMedicalAppointmentProvider',
    );

    expect(primaryKeyConnectionField).toBeDefined();
    expect(primaryKeyConnectionField.type.name.value).toEqual('ModelSubscriptionIDInput');
    expect(sortKeyConnectionField).toBeDefined();
    expect(sortKeyConnectionField.type.name.value).toEqual('ModelSubscriptionStringInput');
  });

  it('adds hasMany sortKeyFields connection fields', () => {
    const inputSchema = `
      type Patient @model {
        ssn: ID! @primaryKey(sortKeyFields: ["givenName", "familyName"])
        givenName: String!
        familyName: String!
        medicalAppointments: [MedicalAppointment] @hasMany
      }

      type MedicalAppointment @model {
        appointmentReference: ID! @primaryKey
        provider: String
        date: AWSDateTime
        patient: Patient @belongsTo
      }
    `;

    const out = testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasManyTransformer(), new BelongsToTransformer()],
    });

    expect(out).toBeDefined();
    const schema = parse(out.schema);
    validateModelSchema(schema);

    const medicalAppointment = schema.definitions.find((def: any) => def.name && def.name.value === 'MedicalAppointment') as any;
    expect(medicalAppointment).toBeDefined();
    const ssnConnectionField = medicalAppointment.fields.find((f: any) => f.name.value === 'patientMedicalAppointmentsSsn');
    const idConnectionField = medicalAppointment.fields.find((f: any) => f.name.value === 'patientMedicalAppointmentsId');

    expect(ssnConnectionField).toBeDefined();
    expect(idConnectionField).not.toBeDefined();

    const givenNameConnectionField = medicalAppointment.fields.find((f: any) => f.name.value === 'patientMedicalAppointmentsGivenName');
    const familyNameConnectionField = medicalAppointment.fields.find((f: any) => f.name.value === 'patientMedicalAppointmentsFamilyName');

    expect(ssnConnectionField).toBeDefined();
    expect(idConnectionField).not.toBeDefined();

    expect(givenNameConnectionField).toBeDefined();
    expect(familyNameConnectionField).toBeDefined();

    const medicalAppointmentFilterInput = schema.definitions.find(
      (def: any) => def.name && def.name.value === 'ModelMedicalAppointmentFilterInput',
    ) as any;
    const medicalAppointmentConditionInput = schema.definitions.find(
      (def: any) => def.name && def.name.value === 'ModelMedicalAppointmentConditionInput',
    ) as any;
    const medicalAppointmentCreateInput = schema.definitions.find(
      (def: any) => def.name && def.name.value === 'CreateMedicalAppointmentInput',
    ) as any;
    const medicalAppointmentUpdateInput = schema.definitions.find(
      (def: any) => def.name && def.name.value === 'UpdateMedicalAppointmentInput',
    ) as any;
    const medicalAppointmentSubscriptionFilterInput = schema.definitions.find(
      (def: any) => def.name && def.name.value === 'ModelSubscriptionPatientFilterInput',
    ) as any;

    expect(medicalAppointmentFilterInput).toBeDefined();
    expect(medicalAppointmentConditionInput).toBeDefined();
    expect(medicalAppointmentCreateInput).toBeDefined();
    expect(medicalAppointmentUpdateInput).toBeDefined();
    expect(medicalAppointmentSubscriptionFilterInput).toBeDefined();

    const inputs = [
      medicalAppointmentFilterInput,
      medicalAppointmentConditionInput,
      medicalAppointmentCreateInput,
      medicalAppointmentUpdateInput,
    ];

    inputs.forEach((it) => {
      const ssnInputField = it.fields.find((f: any) => f.name.value === 'patientMedicalAppointmentsSsn');
      const givenNameInputField = it.fields.find((f: any) => f.name.value === 'patientMedicalAppointmentsGivenName');
      const familyNameInputField = it.fields.find((f: any) => f.name.value === 'patientMedicalAppointmentsFamilyName');

      expect(ssnInputField).toBeDefined();
      expect(givenNameInputField).toBeDefined();
      expect(familyNameInputField).toBeDefined();
    });

    // test subscription filter input has correct types
    const ssnInputField = medicalAppointmentSubscriptionFilterInput.fields.find(
      (f: any) => f.name.value === 'patientMedicalAppointmentsSsn',
    );
    const givenNameInputField = medicalAppointmentSubscriptionFilterInput.fields.find(
      (f: any) => f.name.value === 'patientMedicalAppointmentsGivenName',
    );
    const familyNameInputField = medicalAppointmentSubscriptionFilterInput.fields.find(
      (f: any) => f.name.value === 'patientMedicalAppointmentsFamilyName',
    );

    expect(ssnInputField).toBeDefined();
    expect(ssnInputField.type.name.value).toEqual('ModelSubscriptionIDInput');
    expect(givenNameInputField).toBeDefined();
    expect(givenNameInputField.type.name.value).toEqual('ModelSubscriptionStringInput');
    expect(familyNameInputField).toBeDefined();
    expect(familyNameInputField.type.name.value).toEqual('ModelSubscriptionStringInput');
  });

  it('uses primary key name for hasOne relational connection field old naming convention', () => {
    const inputSchema = `
      type Patient @model {
        ssn: ID! @primaryKey
        givenName: String
        familyName: String
      }

      type MedicalAppointment @model {
        appointmentReference: ID! @primaryKey
        patient: Patient @hasOne
        provider: String
        date: AWSDateTime
      }
    `;

    const out = testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasOneTransformer(), new BelongsToTransformer()],
      transformParameters: {
        respectPrimaryKeyAttributesOnConnectionField: false,
      },
    });

    expect(out).toBeDefined();
    const schema = parse(out.schema);
    validateModelSchema(schema);

    const medicalAppointment = schema.definitions.find((def: any) => def.name && def.name.value === 'MedicalAppointment') as any;
    expect(medicalAppointment).toBeDefined();
    const ssnConnectionField = medicalAppointment.fields.find((f: any) => f.name.value === 'medicalAppointmentPatientSsn');
    const idConnectionField = medicalAppointment.fields.find((f: any) => f.name.value === 'medicalAppointmentPatientId');

    expect(ssnConnectionField).not.toBeDefined();
    expect(idConnectionField).toBeDefined();
  });

  it('uses primary key name for hasMany relational connection field old naming convention', () => {
    const inputSchema = `
      type Post @model {
        postReference: ID! @primaryKey(sortKeyFields: ["title"])
        title: String!
        comments: [Comment] @hasMany
      }
      type Comment @model {
        post: Post @belongsTo
      }
    `;

    const out = testTransform({
      schema: inputSchema,
      transformers: [new ModelTransformer(), new PrimaryKeyTransformer(), new HasManyTransformer(), new BelongsToTransformer()],
      transformParameters: {
        respectPrimaryKeyAttributesOnConnectionField: false,
      },
    });

    expect(out).toBeDefined();
    const schema = parse(out.schema);
    validateModelSchema(schema);

    const comment = schema.definitions.find((def: any) => def.name && def.name.value === 'Comment') as any;
    expect(comment).toBeDefined();
    const referenceConnectionField = comment.fields.find((f: any) => f.name.value === 'postCommentsPostReference');
    const idConnectionField = comment.fields.find((f: any) => f.name.value === 'postCommentsId');
    const titleConnectionField = comment.fields.find((f: any) => f.name.value === 'postCommentsTitle');

    expect(referenceConnectionField).not.toBeDefined();
    expect(idConnectionField).toBeDefined();
    expect(titleConnectionField).toBeDefined();
  });

  it('generated correct connection keys for relational fields with custom PK', () => {
    const inputSchema = `
      type Post @model {
        postReference: ID! @primaryKey(sortKeyFields: ["title"])
        title: String!
        comments: [Comment] @hasMany
      }
      type Comment @model {
        commentReference: ID! @primaryKey(sortKeyFields: ["title"])
        title: String!
        post: Post @belongsTo
      }

      type Car @model {
        vinNumber: ID! @primaryKey(sortKeyFields: ["serialNumber"])
        serialNumber: String!
        engine: Engine @hasOne
      }
      type Engine @model {
        vinNumber: ID! @primaryKey(sortKeyFields: ["manufacturerReference"])
        manufacturerReference: String!
        car: Car @belongsTo
      }
    `;

    const out = testTransform({
      schema: inputSchema,
      transformers: [
        new ModelTransformer(),
        new PrimaryKeyTransformer(),
        new HasOneTransformer(),
        new HasManyTransformer(),
        new BelongsToTransformer(),
      ],
    });

    expect(out).toBeDefined();
    const schema = parse(out.schema);
    validateModelSchema(schema);

    expect(out.resolvers['Car.engine.req.vtl']).toContain(
      '#set( $partitionKeyValue = $util.defaultIfNull($ctx.stash.connectionAttibutes.get("carEngineVinNumber"), $ctx.source.carEngineVinNumber) )',
    );
    expect(out.resolvers['Car.engine.req.vtl']).toContain(
      'if( $util.isNull($partitionKeyValue) || $util.isNull($ctx.source.carEngineManufacturerReference) )',
    );
    expect(out.resolvers['Comment.post.req.vtl']).toContain(
      '#set( $partitionKeyValue = $util.defaultIfNull($ctx.stash.connectionAttibutes.get("postCommentsPostReference"), $ctx.source.postCommentsPostReference)',
    );
    expect(out.resolvers['Comment.post.req.vtl']).toContain(
      'if( $util.isNull($partitionKeyValue) || $util.isNull($ctx.source.postCommentsTitle) )',
    );
    expect(out.resolvers['Engine.car.req.vtl']).toContain(
      '#set( $partitionKeyValue = $util.defaultIfNull($ctx.stash.connectionAttibutes.get("engineCarVinNumber"), $ctx.source.engineCarVinNumber) )',
    );
    expect(out.resolvers['Engine.car.req.vtl']).toContain(
      'if( $util.isNull($partitionKeyValue) || $util.isNull($ctx.source.engineCarSerialNumber) )',
    );

    expect(out.resolvers['Car.engine.req.vtl']).toContain('"#sortKeyName": "manufacturerReference"');
    expect(out.resolvers['Car.engine.req.vtl']).toContain(
      '":sortKeyName": $util.parseJson($util.dynamodb.toDynamoDBJson($util.defaultIfNullOrBlank($ctx.source.carEngineManufacturerReference, "___xamznone____")))',
    );

    expect(out.resolvers['Comment.post.req.vtl']).toContain('"#sortKeyName": "title"');
    expect(out.resolvers['Comment.post.req.vtl']).toContain(
      '":sortKeyName": $util.parseJson($util.dynamodb.toDynamoDBJson($util.defaultIfNullOrBlank($ctx.source.postCommentsTitle, "___xamznone____")))',
    );

    expect(out.resolvers['Engine.car.req.vtl']).toContain('"#sortKeyName": "serialNumber"');
    expect(out.resolvers['Engine.car.req.vtl']).toContain(
      '":sortKeyName": $util.parseJson($util.dynamodb.toDynamoDBJson($util.defaultIfNullOrBlank($ctx.source.engineCarSerialNumber, "___xamznone____")))',
    );
  });

  it('generated correct allowed field for relational fields with custom PK and partial auth', () => {
    const inputSchema = `
      type Post @model @auth(rules: [{ allow: owner }]) {
        postReference: ID! @primaryKey(sortKeyFields: ["title"])
        title: String!
        comments: [Comment] @hasMany
        restricted: String @auth(rules: [{ allow: owner, operations: [] }])
      }
      type Comment @model @auth(rules: [{ allow: owner }])  {
        commentReference: ID! @primaryKey(sortKeyFields: ["title"])
        title: String!
        post: Post @belongsTo
        restricted: String @auth(rules: [{ allow: owner, operations: [] }])
      }

      type Car @model @auth(rules: [{ allow: owner }])  {
        vinNumber: ID! @primaryKey(sortKeyFields: ["serialNumber"])
        serialNumber: String!
        engine: Engine @hasOne
        restricted: String @auth(rules: [{ allow: owner, operations: [] }])
      }
      type Engine @model @auth(rules: [{ allow: owner }])  {
        vinNumber: ID! @primaryKey(sortKeyFields: ["manufacturerReference"])
        manufacturerReference: String!
        car: Car @belongsTo
        restricted: String @auth(rules: [{ allow: owner, operations: [] }])
      }
    `;

    const out = testTransform({
      schema: inputSchema,
      authConfig: {
        defaultAuthentication: {
          authenticationType: 'AMAZON_COGNITO_USER_POOLS',
        },
        additionalAuthenticationProviders: [],
      },
      transformers: [
        new ModelTransformer(),
        new PrimaryKeyTransformer(),
        new HasOneTransformer(),
        new HasManyTransformer(),
        new BelongsToTransformer(),
        new AuthTransformer(),
      ],
    });

    expect(out).toBeDefined();
    const schema = parse(out.schema);
    validateModelSchema(schema);

    expect(out.resolvers['Mutation.createPost.auth.1.req.vtl']).toContain(
      '#set( $ownerAllowedFields0 = ["postReference","title","comments"] )',
    );
    expect(out.resolvers['Mutation.createComment.auth.1.req.vtl']).toContain(
      '#set( $ownerAllowedFields0 = ["commentReference","title","post","postCommentsPostReference","postCommentsTitle"] )',
    );
    expect(out.resolvers['Mutation.createCar.auth.1.req.vtl']).toContain(
      '#set( $ownerAllowedFields0 = ["vinNumber","serialNumber","engine","carEngineVinNumber","carEngineSerialNumber"] )',
    );
    expect(out.resolvers['Mutation.createEngine.auth.1.req.vtl']).toContain(
      '#set( $ownerAllowedFields0 = ["vinNumber","manufacturerReference","car","engineCarVinNumber","engineCarManufacturerReference"] )',
    );
  });

  it('should generate correct fields in the many to many link object', () => {
    [true, false].forEach((respectPrimaryKeyAttributesOnConnectionField) => {
      const inputSchema = `
      type Post @model {
        customPostId: ID! @primaryKey(sortKeyFields: ["sortId"])
        sortId: ID!
        tags: [Tag] @manyToMany(relationName: "PostTag")
      }

      type Tag @model {
        customTagId: ID! @primaryKey(sortKeyFields: ["label"])
        label: ID!
        posts: [Post] @manyToMany(relationName: "PostTag")
      }`;

      const authTransformer = new AuthTransformer();
      const modelTransformer = new ModelTransformer();
      const indexTransformer = new IndexTransformer();
      const hasOneTransformer = new HasOneTransformer();
      const primaryKeyTransformer = new PrimaryKeyTransformer();
      const out = testTransform({
        schema: inputSchema,
        authConfig: {
          defaultAuthentication: {
            authenticationType: 'AMAZON_COGNITO_USER_POOLS',
          },
          additionalAuthenticationProviders: [],
        },
        transformers: [
          modelTransformer,
          primaryKeyTransformer,
          indexTransformer,
          hasOneTransformer,
          new ManyToManyTransformer(modelTransformer, indexTransformer, hasOneTransformer, authTransformer),
          authTransformer,
        ],
        transformParameters: { respectPrimaryKeyAttributesOnConnectionField },
      });
      expect(out).toBeDefined();
      const schema = parse(out.schema);
      validateModelSchema(schema);

      const type = schema.definitions.find((def: any) => def.name && def.name.value === 'PostTag') as ObjectTypeDefinitionNode;
      expect(type).toBeDefined();
      expect(type.fields?.find((f) => f.name.value === 'taglabel')).toBeDefined();
      expect(type.fields?.find((f) => f.name.value === 'postsortId')).toBeDefined();
      expect(
        (type.fields?.find((f) => f.name.value === 'postCustomPostId') !== undefined) === respectPrimaryKeyAttributesOnConnectionField,
      ).toBe(true);
      expect(
        (type.fields?.find((f) => f.name.value === 'tagCustomTagId') !== undefined) === respectPrimaryKeyAttributesOnConnectionField,
      ).toBe(true);
      expect((type.fields?.find((f) => f.name.value === 'postID') !== undefined) !== respectPrimaryKeyAttributesOnConnectionField).toBe(
        true,
      );
      expect((type.fields?.find((f) => f.name.value === 'tagID') !== undefined) !== respectPrimaryKeyAttributesOnConnectionField).toBe(
        true,
      );
    });
  });
});
describe('Resolvers for custom primary key and relational directives', () => {
  const inputSchema = `
    # 1. Implicit Bi hasMany
    type Post1 @model {
      postId: ID! @primaryKey(sortKeyFields:["title"])
      title: String!
      comments: [Comment1] @hasMany
    }
    type Comment1 @model {
      commentId: ID! @primaryKey(sortKeyFields:["content"])
      content: String!
      post: Post1 @belongsTo
    }
    # 2. Implicit Uni hasMany
    type Post2 @model {
      postId: ID! @primaryKey(sortKeyFields:["title"])
      title: String!
      comments: [Comment2] @hasMany
    }
    type Comment2 @model {
      commentId: ID! @primaryKey(sortKeyFields:["content"])
      content: String!
    }
    # 3. Explicit Bi hasMany
    type Post3 @model {
      postId: ID! @primaryKey(sortKeyFields:["title"])
      title: String!
      comments: [Comment3] @hasMany(indexName:"byPost", fields:["postId", "title"])
    }
    type Comment3 @model {
      commentId: ID! @primaryKey(sortKeyFields:["content"])
      content: String!
      post: Post3 @belongsTo(fields:["postId", "postTitle"])
      postId: ID @index(name: "byPost", sortKeyFields:["postTitle"])
      postTitle: String
    }
    # 4. Explicit Uni hasMany
    type Post4 @model {
      postId: ID! @primaryKey(sortKeyFields:["title"])
      title: String!
      comments: [Comment4] @hasMany(indexName:"byPost", fields:["postId", "title"])
    }
    type Comment4 @model {
      commentId: ID! @primaryKey(sortKeyFields:["content"])
      content: String!
      postId: ID @index(name: "byPost", sortKeyFields:["postTitle"]) # customized foreign key for parent primary key
      postTitle: String # customized foreign key for parent sort key
    }
    # 5. Implicit Bi hasMany with multiple SKs
    type Post5 @model {
      postId: ID! @primaryKey(sortKeyFields:["title", "likes"])
      title: String!
      likes: Int!
      comments: [Comment5] @hasMany
    }
    type Comment5 @model {
      commentId: ID! @primaryKey(sortKeyFields:["content"])
      content: String!
      post: Post5 @belongsTo
    }
    # 6. Implicit Uni hasMany with multiple SKs
    type Post6 @model {
      postId: ID! @primaryKey(sortKeyFields:["title", "likes"])
      title: String!
      likes: Int!
      comments: [Comment6] @hasMany
    }
    type Comment6 @model {
      commentId: ID! @primaryKey(sortKeyFields:["content"])
      content: String!
    }
    # 7. manyToMany
    type Post @model {
        customPostId: ID! @primaryKey(sortKeyFields: ["title"])
        title: String!
        content: String
        content2: String
        tags: [Tag] @manyToMany(relationName: "PostTags")
    }
    type Tag @model {
        customTagId: ID! @primaryKey(sortKeyFields: ["label"])
        label: String!
        posts: [Post] @manyToMany(relationName: "PostTags")
    }
  `;
  const setupTransformers = () => {
    const modelTransformer = new ModelTransformer();
    const indexTransformer = new IndexTransformer();
    const hasOneTransformer = new HasOneTransformer();
    const authTransformer = new AuthTransformer();
    return [
      modelTransformer,
      indexTransformer,
      new PrimaryKeyTransformer(),
      new HasManyTransformer(),
      new BelongsToTransformer(),
      new ManyToManyTransformer(modelTransformer, indexTransformer, hasOneTransformer, authTransformer),
    ];
  };

  it('should generate correct dynamoDB partition key and sort key for CPK schema in resolver VTL when CPK feature is enabled', () => {
    const out = testTransform({
      schema: inputSchema,
      transformers: setupTransformers(),
    });
    expect(out).toBeDefined();
    const schema = parse(out.schema);
    validateModelSchema(schema);

    expect(out.resolvers['Post1.comments.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Post2.comments.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Post3.comments.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Post4.comments.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Post5.comments.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Post6.comments.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Post.tags.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Tag.posts.req.vtl']).toMatchSnapshot();
  });
  it('should not generate sort key field in implicit hasMany relation when CPK feature is disabled', () => {
    const out = testTransform({
      schema: inputSchema,
      transformers: setupTransformers(),
      transformParameters: {
        respectPrimaryKeyAttributesOnConnectionField: false,
      },
    });
    expect(out).toBeDefined();
    expect(out.resolvers['Post1.comments.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Post2.comments.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Post5.comments.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Post6.comments.req.vtl']).toMatchSnapshot();
  });
});
