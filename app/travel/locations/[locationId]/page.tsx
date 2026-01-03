import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { getUser } from "@/lib/auth";
import {
  MapPin,
  Globe,
  Phone,
  Clock,
  DollarSign,
  Star,
  Heart,
  Check,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import LocationActions from "./LocationActions";
import FriendsWhoVisited from "./FriendsWhoVisited";
import FriendsHotlist from "./FriendsHotlist";

interface Props {
  params: Promise<{ locationId: string }>;
}

export default async function LocationDetailPage({ params }: Props) {
  const { locationId } = await params;
  const user = await getUser();

  const location = await prisma.travel_locations.findUnique({
    where: { id: locationId },
    include: {
      city: true,
      neighborhood: true,
    },
  });

  if (!location) {
    notFound();
  }

  // Get user-specific data if logged in
  let userData = null;
  if (user) {
    userData = await prisma.travel_user_location_data.findUnique({
      where: {
        user_id_location_id: {
          user_id: user.id,
          location_id: locationId,
        },
      },
    });
  }

  const priceLevel = location.price_level
    ? "$".repeat(location.price_level)
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <Link
        href="/travel/locations"
        className="inline-flex items-center gap-2 mb-6 text-[0.55rem] transition-colors"
        style={{ color: "var(--rpg-muted)" }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Locations
      </Link>

      {/* Main Card */}
      <div
        className="rounded-lg p-6 mb-6"
        style={{
          background: "var(--rpg-card)",
          border: "2px solid var(--rpg-border)",
          boxShadow: "0 4px 0 rgba(0, 0, 0, 0.3)",
        }}
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span
                className="px-2 py-1 rounded text-[0.5rem] uppercase"
                style={{
                  background: "rgba(168, 85, 247, 0.2)",
                  border: "1px solid var(--rpg-purple)",
                  color: "var(--rpg-purple)",
                }}
              >
                {location.type}
              </span>
              {userData?.hotlist && (
                <span
                  className="px-2 py-1 rounded text-[0.5rem]"
                  style={{
                    background: "rgba(239, 68, 68, 0.2)",
                    border: "1px solid #ef4444",
                    color: "#ef4444",
                  }}
                >
                  <Heart className="w-3 h-3 inline mr-1" fill="currentColor" />
                  Hotlist
                </span>
              )}
              {userData?.visited && (
                <span
                  className="px-2 py-1 rounded text-[0.5rem]"
                  style={{
                    background: "rgba(95, 191, 138, 0.2)",
                    border: "1px solid var(--rpg-teal)",
                    color: "var(--rpg-teal)",
                  }}
                >
                  <Check className="w-3 h-3 inline mr-1" />
                  Visited
                </span>
              )}
            </div>
            <h1
              className="text-xl mb-2"
              style={{
                color: "var(--rpg-text)",
                textShadow: "0 0 10px rgba(255, 255, 255, 0.3)",
              }}
            >
              {location.name}
            </h1>
            <p className="text-[0.55rem]" style={{ color: "var(--rpg-muted)" }}>
              {location.neighborhood?.name && (
                <span>{location.neighborhood.name} • </span>
              )}
              {location.city.name}, {location.city.country}
            </p>
          </div>

          {/* Rating */}
          {(location.avg_rating || userData?.personal_rating) && (
            <div className="text-center">
              <div
                className="text-2xl flex items-center gap-2"
                style={{ color: "var(--rpg-gold)" }}
              >
                <Star className="w-6 h-6" fill="currentColor" />
                {(userData?.personal_rating || location.avg_rating)?.toFixed(1)}
              </div>
              <p className="text-[0.45rem]" style={{ color: "var(--rpg-muted)" }}>
                {userData?.personal_rating ? "Your rating" : "Average rating"}
              </p>
            </div>
          )}
        </div>

        {/* Description */}
        {(location.blurb || location.description) && (
          <p
            className="text-[0.55rem] mb-6 leading-relaxed"
            style={{ color: "var(--rpg-text)" }}
          >
            {location.blurb || location.description}
          </p>
        )}

        {/* Details Grid */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {location.address && (
            <div className="flex items-start gap-3">
              <MapPin
                className="w-4 h-4 mt-0.5 flex-shrink-0"
                style={{ color: "var(--rpg-teal)" }}
              />
              <div>
                <p
                  className="text-[0.45rem] mb-1"
                  style={{ color: "var(--rpg-muted)" }}
                >
                  Address
                </p>
                <p className="text-[0.55rem]" style={{ color: "var(--rpg-text)" }}>
                  {location.address}
                </p>
              </div>
            </div>
          )}

          {location.website && (
            <div className="flex items-start gap-3">
              <Globe
                className="w-4 h-4 mt-0.5 flex-shrink-0"
                style={{ color: "var(--rpg-cyan)" }}
              />
              <div>
                <p
                  className="text-[0.45rem] mb-1"
                  style={{ color: "var(--rpg-muted)" }}
                >
                  Website
                </p>
                <a
                  href={location.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[0.55rem] inline-flex items-center gap-1 transition-colors"
                  style={{ color: "var(--rpg-teal)" }}
                >
                  Visit website
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {location.phone && (
            <div className="flex items-start gap-3">
              <Phone
                className="w-4 h-4 mt-0.5 flex-shrink-0"
                style={{ color: "var(--rpg-purple)" }}
              />
              <div>
                <p
                  className="text-[0.45rem] mb-1"
                  style={{ color: "var(--rpg-muted)" }}
                >
                  Phone
                </p>
                <p className="text-[0.55rem]" style={{ color: "var(--rpg-text)" }}>
                  {location.phone}
                </p>
              </div>
            </div>
          )}

          {location.hours && (
            <div className="flex items-start gap-3">
              <Clock
                className="w-4 h-4 mt-0.5 flex-shrink-0"
                style={{ color: "var(--rpg-gold)" }}
              />
              <div>
                <p
                  className="text-[0.45rem] mb-1"
                  style={{ color: "var(--rpg-muted)" }}
                >
                  Hours
                </p>
                <p className="text-[0.55rem]" style={{ color: "var(--rpg-text)" }}>
                  {location.hours}
                </p>
              </div>
            </div>
          )}

          {priceLevel && (
            <div className="flex items-start gap-3">
              <DollarSign
                className="w-4 h-4 mt-0.5 flex-shrink-0"
                style={{ color: "var(--rpg-teal)" }}
              />
              <div>
                <p
                  className="text-[0.45rem] mb-1"
                  style={{ color: "var(--rpg-muted)" }}
                >
                  Price Level
                </p>
                <p className="text-[0.55rem]" style={{ color: "var(--rpg-teal)" }}>
                  {priceLevel}
                </p>
              </div>
            </div>
          )}

          {location.cuisine && (
            <div className="flex items-start gap-3">
              <span
                className="w-4 h-4 mt-0.5 flex-shrink-0 text-center"
                style={{ color: "var(--rpg-gold)" }}
              >
                🍽️
              </span>
              <div>
                <p
                  className="text-[0.45rem] mb-1"
                  style={{ color: "var(--rpg-muted)" }}
                >
                  Cuisine
                </p>
                <p className="text-[0.55rem]" style={{ color: "var(--rpg-text)" }}>
                  {location.cuisine}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Tags */}
        {location.tags && location.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {location.tags.map((tag, i) => (
              <span
                key={i}
                className="px-2 py-1 rounded text-[0.45rem]"
                style={{
                  background: "var(--rpg-border)",
                  color: "var(--rpg-muted)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Other Info */}
        {location.other_info && (
          <div
            className="p-4 rounded"
            style={{
              background: "rgba(0, 0, 0, 0.3)",
              border: "1px solid var(--rpg-border)",
            }}
          >
            <p
              className="text-[0.45rem] mb-2"
              style={{ color: "var(--rpg-muted)" }}
            >
              Additional Info
            </p>
            <p className="text-[0.55rem]" style={{ color: "var(--rpg-text)" }}>
              {location.other_info}
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {user && (
        <LocationActions
          locationId={locationId}
          isHotlist={userData?.hotlist ?? false}
          isVisited={userData?.visited ?? false}
          personalRating={userData?.personal_rating ?? null}
        />
      )}

      {/* Friends Who Visited */}
      {user && <FriendsWhoVisited locationId={locationId} />}

      {/* Friends Who Want to Visit (Hotlist) */}
      {user && <FriendsHotlist locationId={locationId} />}

      {/* User Notes */}
      {userData?.notes && (
        <div
          className="rounded-lg p-5 mt-6"
          style={{
            background: "var(--rpg-card)",
            border: "2px solid var(--rpg-border)",
            boxShadow: "0 4px 0 rgba(0, 0, 0, 0.3)",
          }}
        >
          <h3
            className="text-[0.65rem] mb-3"
            style={{ color: "var(--rpg-text)" }}
          >
            Your Notes
          </h3>
          <p className="text-[0.55rem]" style={{ color: "var(--rpg-muted)" }}>
            {userData.notes}
          </p>
        </div>
      )}
    </div>
  );
}
