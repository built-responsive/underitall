
import { Page, BlockStack, Text, Link } from '@shopify/ui-extensions/customer-account';
import { reactExtension } from '@shopify/ui-extensions-react/customer-account';

export default reactExtension('customer-account.page.render', () => <ProfilePage />);

function ProfilePage() {
  return (
    <Page title="Wholesale Account">
      <BlockStack spacing="loose">
        <Text>Welcome to your wholesale account profile page.</Text>
        <Text>This is a full-page extension rendered at customer-account.page.render.</Text>
        <Link to="/account">Back to Account</Link>
      </BlockStack>
    </Page>
  );
}
