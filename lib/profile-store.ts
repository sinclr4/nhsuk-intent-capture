import { CosmosClient, type Container } from '@azure/cosmos';

export const PROFILE_COOKIE = 'nhs-demo-id';

export type Profile = {
  name: string;
  dateOfBirth: string;
  homePostcode: string;
};

type ProfileDocument = Profile & {
  id: string;
  demoId: string;
  type: 'ai-profile';
  updatedAt: string;
};

let container: Container | null = null;

function getContainer() {
  if (container) return container;
  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;
  const databaseName = process.env.COSMOS_DATABASE;
  const containerName = process.env.COSMOS_CONTAINER;
  if (!endpoint || !key || !databaseName || !containerName) return null;

  const client = new CosmosClient({ endpoint, key });
  container = client.database(databaseName).container(containerName);
  return container;
}

export function isProfileStoreConfigured() {
  return Boolean(
    process.env.COSMOS_ENDPOINT &&
      process.env.COSMOS_KEY &&
      process.env.COSMOS_DATABASE &&
      process.env.COSMOS_CONTAINER,
  );
}

export async function readProfile(demoId: string): Promise<Profile | null> {
  const cosmosContainer = getContainer();
  if (!cosmosContainer) return null;
  try {
    const { resource } = await cosmosContainer.item(demoId, demoId).read<ProfileDocument>();
    if (!resource) return null;
    return { name: resource.name, dateOfBirth: resource.dateOfBirth, homePostcode: resource.homePostcode };
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 404) return null;
    throw error;
  }
}

export async function saveProfile(demoId: string, profile: Profile) {
  const cosmosContainer = getContainer();
  if (!cosmosContainer) throw new Error('Profile storage is not configured');
  await cosmosContainer.items.upsert<ProfileDocument>({
    id: demoId,
    demoId,
    type: 'ai-profile',
    ...profile,
    updatedAt: new Date().toISOString(),
  });
}