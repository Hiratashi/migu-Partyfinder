import Link from "next/link";

export default async function Login({
  searchParams,
}:{
  searchParams:Promise<{error?:string}>;
}) {
  const {error}=await searchParams;

  const messages:Record<string,string>={
    not_guild_member:
      "Your Discord account is not a member of the configured guild.",
    missing_role:
      "You do not have the required Discord role.",
    oauth_state:
      "The login request expired or could not be verified.",
    discord:
      "Discord login failed. Please try again.",
    access_disabled:
      "Your Partyfinder access has been disabled by an administrator. If you believe this is a mistake, please contact a guild administrator.",
  };

  return <main className="hero">
    <div
      className="card"
      style={{
        maxWidth:560,
        margin:"70px auto",
      }}
    >
      <h1 style={{fontSize:"2rem"}}>
        Guild login
      </h1>

      <p className="muted">
        No separate password. Sign in with Discord; access is granted only
        to members of the configured guild.
      </p>

      {error&&
        <p className="error" role="alert">
          {messages[error]??"Login failed."}
        </p>
      }

      <Link
        className="btn primary"
        href="/api/auth/login"
      >
        Continue with Discord
      </Link>
    </div>
  </main>;
}
