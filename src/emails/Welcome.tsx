import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"
import * as React from "react"

import { styles } from "./styles"

interface WelcomeEmailProps {
  name: string
  dashboardUrl?: string
  unsubscribeUrl?: string
}

export function WelcomeEmail({
  name,
  dashboardUrl = "https://nodebanana.com/dashboard",
  unsubscribeUrl = "https://nodebanana.com/dashboard/settings",
}: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Node Banana!</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Welcome aboard, {name}!</Heading>
          <Text style={styles.text}>
            Thanks for joining Node Banana. We&apos;re excited to have you!
          </Text>
          <Text style={styles.text}>
            Get started by creating your first AI workflow in the editor.
          </Text>
          <Section style={{ marginTop: "24px" }}>
            <Button style={styles.button} href={dashboardUrl}>
              Go to Dashboard
            </Button>
          </Section>
          <Text style={styles.footer}>
            Node Banana{"\n"}
            <Link href={unsubscribeUrl} style={{ color: "#999999" }}>
              Manage email preferences
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default WelcomeEmail
