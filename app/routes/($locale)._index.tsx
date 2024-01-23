import {Suspense} from 'react';
import {defer, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {Await, useLoaderData} from '@remix-run/react';
import {AnalyticsPageType} from '@shopify/hydrogen';

import {ProductSwimlane, FeaturedCollections} from '~/components';
import {MEDIA_FRAGMENT, PRODUCT_CARD_FRAGMENT} from '~/data/fragments';
import {seoPayload} from '~/lib/seo.server';
import {routeHeaders} from '~/data/cache';
import HeroInfo from '~/components/HeroInfo';
import HeroTwo from '~/components/HeroTwo';
import {ProductSwimlaneTwo} from '~/components/ProductSwimlaneTwo';
import SliderMenuVendor from '~/components/SliderMenuVendor';
import SliderMenuWsp from '~/components/SliderMenuWsp';

export const headers = routeHeaders;

export async function loader({params, context}: LoaderFunctionArgs) {
  const {language, country} = context.storefront.i18n;

  if (
    params.locale &&
    params.locale.toLowerCase() !== `${language}-${country}`.toLowerCase()
  ) {
    // If the locale URL param is defined, yet we still are on `EN-US`
    // the the locale param must be invalid, send to the 404 page
    throw new Response(null, {status: 404});
  }

  const {shop} = await context.storefront.query(HOMEPAGE_SEO_QUERY, {
    variables: {handle: 'home-hero'},
  });

  const seo = seoPayload.home();

  return defer({
    shop,
    featuredCollection: context.storefront.query(FEATURED_COLLECTION_QUERY, {
      variables: {
        handle: 'Featured',
        country,
        language,
      },
    }),
    featuredProducts: context.storefront.query(
      HOMEPAGE_FEATURED_PRODUCTS_QUERY,
      {
        variables: {
          country,
          language,
        },
      },
    ),
    featuredCollections: context.storefront.query(FEATURED_COLLECTIONS_QUERY, {
      variables: {
        country,
        language,
      },
    }),
    analytics: {
      pageType: AnalyticsPageType.home,
    },
    seo,
  });
}

export default function Homepage() {
  const {featuredCollections, featuredProducts, featuredCollection} =
    useLoaderData<typeof loader>();

  return (
    <>
      <div className="h-[545px] md:h-[820px] bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-stone-900 via-gray-900 to-neutral-800">
        <HeroInfo />
      </div>

      {featuredProducts && (
        <Suspense>
          <Await resolve={featuredProducts}>
            {({products}) => {
              if (!products?.nodes) return <></>;
              const filteredProducts = products.nodes.filter(
                (product) =>
                  product.collections.edges.length > 0 &&
                  product.collections.edges[0].node.title === 'Featured',
              );

              return (
                <ProductSwimlane
                  products={{nodes: filteredProducts}}
                  count={4}
                />
              );
            }}
          </Await>
        </Suspense>
      )}

      <div className="pt-2 sm:pt-14">
        <HeroTwo />
      </div>

      <SliderMenuWsp />
      <SliderMenuVendor />
      {featuredProducts && (
        <Suspense>
          <Await resolve={featuredProducts}>
            {({products}) => {
              if (!products?.nodes) return <></>;
              const filteredProducts = products.nodes.filter(
                (product: {vendor: string}) => product.vendor === '100%',
              );

              return (
                <div>
                  <h1 className="flex justify-center text-rose-100 text-4xl sm:text-5xl font-racing font-semibold mx-auto items-center gap-2 pt-8">
                    productos
                    <span className="font-racing text-5xl sm:text-6xl text-center font-bold text-red-300">
                      {filteredProducts[0].vendor}
                    </span>
                  </h1>
                  <ProductSwimlaneTwo
                    products={{nodes: filteredProducts}}
                    count={4}
                  />
                </div>
              );
            }}
          </Await>
        </Suspense>
      )}

      {featuredCollections && (
        <Suspense>
          <Await resolve={featuredCollections}>
            {({collections}) => {
              if (!collections?.nodes) return <></>;
              return (
                <FeaturedCollections
                  collections={{nodes: collections.nodes}}
                  title="Collections"
                />
              );
            }}
          </Await>
        </Suspense>
      )}
    </>
  );
}

const COLLECTION_CONTENT_FRAGMENT = `#graphql
  fragment CollectionContent on Collection {
    id
    handle
    title
    descriptionHtml
    heading: metafield(namespace: "hero", key: "title") {
      value
    }
    byline: metafield(namespace: "hero", key: "byline") {
      value
    }
    cta: metafield(namespace: "hero", key: "cta") {
      value
    }
    spread: metafield(namespace: "hero", key: "spread") {
      reference {
        ...Media
      }
    }
    spreadSecondary: metafield(namespace: "hero", key: "spread_secondary") {
      reference {
        ...Media
      }
    }
    image {
      altText
      width
      height
      url
    }
  }
  ${MEDIA_FRAGMENT}
` as const;

const HOMEPAGE_SEO_QUERY = `#graphql
  query seoCollectionContent($handle: String, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    hero: collection(handle: $handle) {
      ...CollectionContent
    }
    shop {
      name
      description
    }
  }
  ${COLLECTION_CONTENT_FRAGMENT}
` as const;

export const HOMEPAGE_FEATURED_PRODUCTS_QUERY = `#graphql
  query homepageFeaturedProducts($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    products(first: 40,sortKey: UPDATED_AT) {
      nodes {
        ...ProductCard
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
` as const;

export const FEATURED_COLLECTIONS_QUERY = `#graphql
  query homepageFeaturedCollections($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    collections(
      first: 6,
      sortKey: UPDATED_AT
    ) {
      nodes {
        id
        title
        handle
        image {
          altText
          width
          height
          url
        }
      }
    }
  }
` as const;

export const FEATURED_COLLECTION_QUERY = `#graphql
  query featuredCollection($handle: String!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      ...CollectionContent
    }
  }
  ${COLLECTION_CONTENT_FRAGMENT}
` as const;
