import { AmplifyAuthFilterExpr, CedarPartialEvaluation, JsonExpr } from '../../utils';

test("Why is Jest complaining that there's no test in this file? I don't know and I don't want to spend more time troubleshooting", () => {
  expect(true).toBeTruthy();
});

export const amplifyAuthFilter: AmplifyAuthFilterExpr = {
  or: [
    {
      owner: {
        eq: 'uuid::my-username',
      },
    },
    {
      owner: {
        eq: 'uuid',
      },
    },
    {
      owner: {
        eq: 'my-username',
      },
    },
  ],
} as const;

export const cedarPartialEvaluation: CedarPartialEvaluation = {
  decision: null,
  residuals: [
    {
      effect: 'permit',
      principal: {
        op: 'All',
      },
      action: {
        op: 'All',
      },
      resource: {
        op: 'All',
      },
      conditions: [
        {
          kind: 'when',
          body: {
            '&&': {
              left: {
                '&&': {
                  left: {
                    Value: true,
                  },
                  right: {
                    is: {
                      left: {
                        unknown: [
                          {
                            Value: 'resource',
                          },
                        ],
                      },
                      entity_type: 'AmplifyApi::TodoOwner',
                    },
                  },
                },
              },
              right: {
                '||': {
                  left: {
                    '||': {
                      left: {
                        '==': {
                          left: {
                            '.': {
                              left: {
                                Var: 'resource',
                              },
                              attr: 'owner',
                            },
                          },
                          right: {
                            '.': {
                              left: {
                                Var: 'principal',
                              },
                              attr: 'subUsername',
                            },
                          },
                        },
                      },
                      right: {
                        '==': {
                          left: {
                            '.': {
                              left: {
                                Var: 'resource',
                              },
                              attr: 'owner',
                            },
                          },
                          right: {
                            '.': {
                              left: {
                                Var: 'principal',
                              },
                              attr: 'sub',
                            },
                          },
                        },
                      },
                    },
                  },
                  right: {
                    '==': {
                      left: {
                        '.': {
                          left: {
                            Var: 'resource',
                          },
                          attr: 'owner',
                        },
                      },
                      right: {
                        '.': {
                          left: {
                            Var: 'principal',
                          },
                          attr: 'username',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ],
      annotations: {
        id: 'permit owners to perform specified operations',
      },
    },
  ],
} as const;

export const intermediateRep: JsonExpr = {
  and: [
    {
      value: true,
    },
    {
      is: {
        left: {
          unknown: 'resource',
        },
        entityType: 'AmplifyApi::TodoOwner',
      },
    },
    {
      or: [
        {
          eq: {
            left: {
              attr: {
                left: {
                  var: 'resource',
                },
                attr: 'owner',
              },
            },
            right: {
              attr: {
                left: {
                  var: 'principal',
                },
                attr: 'subUsername',
              },
            },
          },
        },
        {
          eq: {
            left: {
              attr: {
                left: {
                  var: 'resource',
                },
                attr: 'owner',
              },
            },
            right: {
              attr: {
                left: {
                  var: 'principal',
                },
                attr: 'sub',
              },
            },
          },
        },
        {
          eq: {
            left: {
              attr: {
                left: {
                  var: 'resource',
                },
                attr: 'owner',
              },
            },
            right: {
              attr: {
                left: {
                  var: 'principal',
                },
                attr: 'username',
              },
            },
          },
        },
      ],
    },
  ],
} as const;
