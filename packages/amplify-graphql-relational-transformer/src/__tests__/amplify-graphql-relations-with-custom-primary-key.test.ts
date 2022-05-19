import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { GraphQLTransform, validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { parse } from 'graphql';
import { BelongsToTransformer, HasManyTransformer, HasOneTransformer } from '..';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const mockFeatureFlags = (useFieldNameForPrimaryKeyConnectionField: boolean) => ({
  getBoolean: jest.fn().mockImplementation((name, defaultValue) => {
    if (name === 'useFieldNameForPrimaryKeyConnectionField') {
      return useFieldNameForPrimaryKeyConnectionField;
    }
    return defaultValue;
  }),
  getNumber: jest.fn(),
  getObject: jest.fn(),
  getString: jest.fn(),
});

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

    const transformer = new GraphQLTransform({
      featureFlags: mockFeatureFlags(true),
      transformers: [
        new ModelTransformer(),
        new PrimaryKeyTransformer(),
        new HasOneTransformer(),
        new BelongsToTransformer(),
      ],
    });

    const out = transformer.transform(inputSchema);
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

    const transformer = new GraphQLTransform({
      featureFlags: mockFeatureFlags(true),
      transformers: [
        new ModelTransformer(),
        new PrimaryKeyTransformer(),
        new HasOneTransformer(),
        new BelongsToTransformer(),
      ],
    });

    const out = transformer.transform(inputSchema);
    expect(out).toBeDefined();
    const schema = parse(out.schema);
    validateModelSchema(schema);

    const medicalAppointment = schema.definitions.find((def: any) => def.name && def.name.value === 'MedicalAppointment') as any;
    expect(medicalAppointment).toBeDefined();
    const medicalAppointmentSsnConnectionField = medicalAppointment.fields.find((f: any) => f.name.value === 'medicalAppointmentPatientSsn');
    const medicalAppointmentIdConnectionField = medicalAppointment.fields.find((f: any) => f.name.value === 'medicalAppointmentPatientId');

    expect(medicalAppointmentSsnConnectionField).toBeDefined();
    expect(medicalAppointmentIdConnectionField).not.toBeDefined();

    const patient = schema.definitions.find((def: any) => def.name && def.name.value === 'Patient') as any;
    expect(patient).toBeDefined();
    const patientAppointmentReferenceConnectionField = patient.fields.find((f: any) => f.name.value === 'patientMedicalAppointmentAppointmentReference');
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

    const transformer = new GraphQLTransform({
      featureFlags: mockFeatureFlags(true),
      transformers: [
        new ModelTransformer(),
        new PrimaryKeyTransformer(),
        new HasManyTransformer(),
        new BelongsToTransformer(),
      ],
    });

    const out = transformer.transform(inputSchema);
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

    const transformer = new GraphQLTransform({
      featureFlags: mockFeatureFlags(true),
      transformers: [
        new ModelTransformer(),
        new PrimaryKeyTransformer(),
        new HasManyTransformer(),
        new BelongsToTransformer(),
      ],
    });

    const out = transformer.transform(inputSchema);
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

    const transformer = new GraphQLTransform({
      featureFlags: mockFeatureFlags(true),
      transformers: [
        new ModelTransformer(),
        new PrimaryKeyTransformer(),
        new HasOneTransformer(),
        new BelongsToTransformer(),
      ],
    });

    const out = transformer.transform(inputSchema);
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

    const medicalAppointmentFilterInput = schema.definitions.find((def: any) => def.name && def.name.value === 'ModelMedicalAppointmentFilterInput') as any;
    const medicalAppointmentConditionInput = schema.definitions.find((def: any) => def.name && def.name.value === 'ModelMedicalAppointmentConditionInput') as any;
    const medicalAppointmentCreateInput = schema.definitions.find((def: any) => def.name && def.name.value === 'CreateMedicalAppointmentInput') as any;
    const medicalAppointmentUpdateInput = schema.definitions.find((def: any) => def.name && def.name.value === 'UpdateMedicalAppointmentInput') as any;

    expect(medicalAppointmentFilterInput).toBeDefined();
    expect(medicalAppointmentConditionInput).toBeDefined();
    expect(medicalAppointmentCreateInput).toBeDefined();
    expect(medicalAppointmentUpdateInput).toBeDefined();

    const inputs = [
      medicalAppointmentFilterInput,
      medicalAppointmentConditionInput,
      medicalAppointmentCreateInput,
      medicalAppointmentUpdateInput,
    ];

    inputs.forEach(it => {
      const ssnInputField = it.fields.find((f: any) => f.name.value === 'medicalAppointmentPatientSsn');
      const givenNameInputField = it.fields.find((f: any) => f.name.value === 'medicalAppointmentPatientGivenName');
      const familyNameInputField = it.fields.find((f: any) => f.name.value === 'medicalAppointmentPatientFamilyName');

      expect(ssnInputField).toBeDefined();
      expect(givenNameInputField).toBeDefined();
      expect(familyNameInputField).toBeDefined();
    });
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

    const transformer = new GraphQLTransform({
      featureFlags: mockFeatureFlags(true),
      transformers: [
        new ModelTransformer(),
        new PrimaryKeyTransformer(),
        new HasOneTransformer(),
        new BelongsToTransformer(),
      ],
    });

    const out = transformer.transform(inputSchema);
    expect(out).toBeDefined();
    const schema = parse(out.schema);
    validateModelSchema(schema);

    const medicalAppointment = schema.definitions.find((def: any) => def.name && def.name.value === 'MedicalAppointment') as any;
    expect(medicalAppointment).toBeDefined();
    const medicalAppointmentSsnConnectionField = medicalAppointment.fields.find((f: any) => f.name.value === 'medicalAppointmentPatientSsn');
    const medicalAppointmentIdConnectionField = medicalAppointment.fields.find((f: any) => f.name.value === 'medicalAppointmentPatientId');

    expect(medicalAppointmentSsnConnectionField).toBeDefined();
    expect(medicalAppointmentIdConnectionField).not.toBeDefined();

    const patient = schema.definitions.find((def: any) => def.name && def.name.value === 'Patient') as any;
    expect(patient).toBeDefined();
    const patientAppointmentReferenceConnectionField = patient.fields.find((f: any) => f.name.value === 'patientMedicalAppointmentAppointmentReference');
    const patientIdConnectionField = patient.fields.find((f: any) => f.name.value === 'patientMedicalAppointmentId');

    expect(patientAppointmentReferenceConnectionField).toBeDefined();
    expect(patientIdConnectionField).not.toBeDefined();

    const providerConnectionField = patient.fields.find((f: any) => f.name.value === 'patientMedicalAppointmentProvider');
    expect(providerConnectionField).toBeDefined();

    const patientFilterInput = schema.definitions.find((def: any) => def.name && def.name.value === 'ModelPatientFilterInput') as any;
    const patientConditionInput = schema.definitions.find((def: any) => def.name && def.name.value === 'ModelPatientConditionInput') as any;
    const patientCreateInput = schema.definitions.find((def: any) => def.name && def.name.value === 'CreatePatientInput') as any;
    const patientUpdateInput = schema.definitions.find((def: any) => def.name && def.name.value === 'UpdatePatientInput') as any;

    expect(patientFilterInput).toBeDefined();
    expect(patientConditionInput).toBeDefined();
    expect(patientCreateInput).toBeDefined();
    expect(patientUpdateInput).toBeDefined();

    const inputs = [
      patientFilterInput,
      patientConditionInput,
      patientCreateInput,
      patientUpdateInput,
    ];

    inputs.forEach(it => {
      const primaryKeyConnectionField = it.fields.find((f: any) => f.name.value === 'patientMedicalAppointmentAppointmentReference');
      const sortKeyConnectionField = it.fields.find((f: any) => f.name.value === 'patientMedicalAppointmentProvider');

      expect(primaryKeyConnectionField).toBeDefined();
      expect(sortKeyConnectionField).toBeDefined();
    });
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

    const transformer = new GraphQLTransform({
      featureFlags: mockFeatureFlags(true),
      transformers: [
        new ModelTransformer(),
        new PrimaryKeyTransformer(),
        new HasManyTransformer(),
        new BelongsToTransformer(),
      ],
    });

    const out = transformer.transform(inputSchema);
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

    const medicalAppointmentFilterInput = schema.definitions.find((def: any) => def.name && def.name.value === 'ModelMedicalAppointmentFilterInput') as any;
    const medicalAppointmentConditionInput = schema.definitions.find((def: any) => def.name && def.name.value === 'ModelMedicalAppointmentConditionInput') as any;
    const medicalAppointmentCreateInput = schema.definitions.find((def: any) => def.name && def.name.value === 'CreateMedicalAppointmentInput') as any;
    const medicalAppointmentUpdateInput = schema.definitions.find((def: any) => def.name && def.name.value === 'UpdateMedicalAppointmentInput') as any;

    expect(medicalAppointmentFilterInput).toBeDefined();
    expect(medicalAppointmentConditionInput).toBeDefined();
    expect(medicalAppointmentCreateInput).toBeDefined();
    expect(medicalAppointmentUpdateInput).toBeDefined();

    const inputs = [
      medicalAppointmentFilterInput,
      medicalAppointmentConditionInput,
      medicalAppointmentCreateInput,
      medicalAppointmentUpdateInput,
    ];

    inputs.forEach(it => {
      const ssnInputField = it.fields.find((f: any) => f.name.value === 'patientMedicalAppointmentsSsn');
      const givenNameInputField = it.fields.find((f: any) => f.name.value === 'patientMedicalAppointmentsGivenName');
      const familyNameInputField = it.fields.find((f: any) => f.name.value === 'patientMedicalAppointmentsFamilyName');

      expect(ssnInputField).toBeDefined();
      expect(givenNameInputField).toBeDefined();
      expect(familyNameInputField).toBeDefined();
    });
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

    const transformer = new GraphQLTransform({
      featureFlags: mockFeatureFlags(false),
      transformers: [
        new ModelTransformer(),
        new PrimaryKeyTransformer(),
        new HasOneTransformer(),
        new BelongsToTransformer(),
      ],
    });

    const out = transformer.transform(inputSchema);
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

    const transformer = new GraphQLTransform({
      featureFlags: mockFeatureFlags(false),
      transformers: [
        new ModelTransformer(),
        new PrimaryKeyTransformer(),
        new HasManyTransformer(),
        new BelongsToTransformer(),
      ],
    });

    const out = transformer.transform(inputSchema);
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

    const transformer = new GraphQLTransform({
      featureFlags: mockFeatureFlags(true),
      transformers: [
        new ModelTransformer(),
        new PrimaryKeyTransformer(),
        new HasOneTransformer(),
        new HasManyTransformer(),
        new BelongsToTransformer(),
      ],
    });

    const out = transformer.transform(inputSchema);
    expect(out).toBeDefined();
    const schema = parse(out.schema);
    validateModelSchema(schema);

    expect(out.resolvers['Car.engine.req.vtl']).toContain('if( $util.isNull($ctx.source.carEngineVinNumber) || $util.isNull($ctx.source.carEngineManufacturerReference) )');
    expect(out.resolvers['Comment.post.req.vtl']).toContain('if( $util.isNull($ctx.source.postCommentsPostReference) || $util.isNull($ctx.source.postCommentsTitle) )');
    expect(out.resolvers['Engine.car.req.vtl']).toContain('if( $util.isNull($ctx.source.engineCarVinNumber) || $util.isNull($ctx.source.engineCarSerialNumber) )');

    expect(out.resolvers['Car.engine.req.vtl']).toContain('"#sortKeyName": "manufacturerReference"');
    expect(out.resolvers['Car.engine.req.vtl']).toContain('":sortKeyName": $util.parseJson($util.dynamodb.toDynamoDBJson($util.defaultIfNullOrBlank($ctx.source.carEngineManufacturerReference, "___xamznone____")))');

    expect(out.resolvers['Comment.post.req.vtl']).toContain('"#sortKeyName": "title"');
    expect(out.resolvers['Comment.post.req.vtl']).toContain('":sortKeyName": $util.parseJson($util.dynamodb.toDynamoDBJson($util.defaultIfNullOrBlank($ctx.source.postCommentsTitle, "___xamznone____")))');

    expect(out.resolvers['Engine.car.req.vtl']).toContain('"#sortKeyName": "serialNumber"');
    expect(out.resolvers['Engine.car.req.vtl']).toContain('":sortKeyName": $util.parseJson($util.dynamodb.toDynamoDBJson($util.defaultIfNullOrBlank($ctx.source.engineCarSerialNumber, "___xamznone____")))');
  });
});
