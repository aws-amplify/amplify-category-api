import { TransformerPluginProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { constructTransformerChain } from '../../amplify-graphql-transform/graphql-transformer-v2';

describe('constructTransformerChain', () => {
    it('returns 14 transformers when no custom transformers are provided', () => {
        expect(constructTransformerChain([]).length).toEqual(14);
    });


    it('returns 16 transformers when 2 custom transformers are provided', () => {
        const customTransformers: TransformerPluginProvider[] = [
            {} as unknown as TransformerPluginProvider,
            {} as unknown as TransformerPluginProvider,
        ];
        expect(constructTransformerChain(customTransformers).length).toEqual(16);
    });
});